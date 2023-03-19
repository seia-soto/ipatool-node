/* eslint-disable no-await-in-loop */
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import * as ipatool from '../src/index.js';

export const getFeedback = async (question: string) => {
	const instance = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const answer = await instance.question(question);

	instance.close();

	return answer;
};

export const getSignedInstanceFromArchive = async () => {
	const location = path.resolve(process.cwd(), '__instance__.json');

	if (!existsSync(location)) {
		return false;
	}

	const buff = await readFile(location, 'utf-8');
	const archive = JSON.parse(buff) as ipatool.InstanceSerialized;

	return ipatool.createInstance(archive);
};

export const createSignedInstance = async () => {
	const email = await getFeedback('Apple ID: ');
	const password = await getFeedback('Password: ');

	const instance = await ipatool.createInstance();
	const isMfaEnabled = await ipatool.signIn(instance, {email, password, token: ''});

	if (!isMfaEnabled) {
		throw new Error('Failed to login at Apple!');
	}

	const token = await getFeedback('Authentication Code: ');
	const account = await ipatool.signIn(instance, {email, password, token});

	if (typeof account === 'boolean') {
		throw new Error('Failed to login at Apple!');
	}

	console.log(`Signed in as ${account.accountInfo.address.firstName} ${account.accountInfo.address.lastName}`);
	console.log('Saving the instance');

	await writeFile(path.resolve(process.cwd(), '__instance__.json'), JSON.stringify(await ipatool.serializeInstance(instance)), 'utf-8');

	return instance;
};

export const getApplication = async (instance: ipatool.Instance) => {
	let country: keyof typeof ipatool.storeFronts;

	for (; ;) {
		country = await getFeedback('Country Code (A2): ') as typeof country;

		if (!(country in ipatool.storeFronts)) {
			console.error('Country code was not found!');

			continue;
		}

		break;
	}

	let trackId: number;

	for (; ;) {
		const keyword = await getFeedback('Application Name: ');
		const results = await ipatool.search(instance, country, keyword, 5);

		for (let i = 0; i < results.length; i++) {
			const result = results[i];

			console.log(`[${i + 1}] ${result.trackId} ${result.artistName} ${result.trackName} (${result.bundleId}) ${result.price} ${result.currency}`);
		}

		const target = await getFeedback('Select: ');
		const targetNumber = parseInt(target, 10) - 1;

		if (isNaN(targetNumber) && targetNumber >= 0 && targetNumber < results.length) {
			console.error('Invalid number provided!');

			continue;
		}

		trackId = results[targetNumber].trackId;

		break;
	}

	return {
		country,
		trackId,
	};
};

const downloadOrPurchase = async (instance: ipatool.Instance, country: keyof typeof ipatool.storeFronts, trackId: number) => {
	console.log('Fetching license');

	let license = await ipatool.permitLicense(instance, trackId)
		.catch((error: Error) => {
			if (error.message === ipatool.Errors.LicenseUnavailable) {
				return false as const;
			}

			throw error;
		});

	if (!license) {
		console.log('Acquiring license');

		const response = await ipatool.purchaseLicense(instance, country, trackId, false);

		console.log(JSON.stringify(response));

		license = await ipatool.permitLicense(instance, trackId);
	}

	const entry = license.songList[0];

	if (!entry) {
		throw new Error('No downloadable content was found!');
	}

	console.log('Downloading application payload');

	const response = await instance.fetcher(entry.URL);

	console.log('Patching application payload');

	const payload = await ipatool.patchPayload(response.rawBody, entry);

	console.log('Writing into file');

	await writeFile(path.resolve(process.cwd(), `${trackId}.ipa`), payload, 'utf-8');
};

(async () => {
	const instance = await getSignedInstanceFromArchive() || await createSignedInstance();
	const {country, trackId} = await getApplication(instance);

	await downloadOrPurchase(instance, country, trackId);
})();
