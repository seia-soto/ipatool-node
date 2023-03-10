import got, {type Got} from 'got';
import plist from 'plist';
import {CookieJar} from 'tough-cookie';

export enum FailureTypes {
	InvalidCredentials = '-5000',
	PasswordTokenExpired = '2034',
	LicenseNotFound = '9610',
	TemporarilyUnavailable = '2059',
}

export enum Routes {
	iTunesApi = 'itunes.apple.com',
	AppStoreApiWithAuthCode = 'p25-buy.itunes.apple.com',
	AppStoreApiWithoutAuthCode = 'p71-buy.itunes.apple.com',
}

export enum Signatures {
	HttpHeaderStoreFront = 'X-Set-Apple-Store-Front',
	HttpHeaderUserAgent = 'Configurator/2.15 (Macintosh; OperatingSystem X 11.0.0; 16G29) AppleWebKit/2603.3.8',
}

export enum Errors {
	InvalidAppleIdCredentials = 'IPA_INVALID_APPLE_ID_CREDENTIALS',
	PasswordTokenExpired = 'IPA_PASSWORD_TOKEN_EXPIRED',
	ServiceNotAvailable = 'IPA_SERVER_NOT_AVAILABLE',
}

export type Instance = {
	fetcher: Got;
	cookies: CookieJar;
	machine: {
		guid: string;
	};
};

export type InstanceSerialized = {
	cookies: CookieJar.Serialized;
	machine: {
		guid: string;
	};
};

/**
 * Creates a GUID string emulates Apple machine
 * If you want to generate GUID which is truly random, you can do it by generating mac address in upper case and remove all colons
 * @param seed `16384` by default, The seed to define randomness range
 * @returns The random GUID string created with randomness range of 16 to `seed = 16384` by default
 */
export const createGuid = (seed = 16384) => {
	let guid = '';

	for (let i = 0; i < 6; i++) {
		guid += ((Math.random() * seed) + 16).toString(16).slice(0, 2);
	}

	return guid.toUpperCase();
};

/**
 * Deserializes or creates an instance
 * @param serializedInstance Serialized instance with `serializeInstance` method
 * @returns Instance for future methods
 */
export const createInstance = async (serializedInstance?: InstanceSerialized) => {
	const cookieJar = serializedInstance?.cookies
		? await CookieJar.deserialize(serializedInstance.cookies)
		: new CookieJar();
	const fetcher = got.extend({
		cookieJar,
	});

	const instance: Instance = {
		fetcher,
		cookies: cookieJar,
		machine: {
			guid: serializedInstance?.machine.guid ?? createGuid(),
		},
	};

	return instance;
};

/**
 * Serializes the instance to JSON-safe format
 * @param instance The instance
 * @returns The object containing information to be deserialized with the `createInstance` method.
 */
export const serializeInstance = async (instance: Instance) => ({
	cookies: await instance.cookies.serialize(),
	machine: instance.machine,
});

/**
 * Try to sign in with your Apple ID
 * — Note that you need to handle error properly as the return type is not used to express if it's succeeded
 * @example const isMfaTokenRequired = await signIn(instance, { email: 'user@domain.tld', password: '' });
 * if (isMfaTokenRequired) await signIn(instance, { email: 'user@domain.tld', password: '', token: '000000' });
 * @param instance The instance
 * @param credential The Apple ID credential including email, password, and 2FA token (optional)
 * @returns Returns `true` if Apple requires 2FA token, otherwise `false` on authenticated; It will throw an error containing error codes from `Errors`
 */
export const signIn = async (
	instance: Instance,
	{
		email,
		password,
		token = '',
	}: {
		email: string;
		password: string;
		token: string;
	},
) => {
	const host = token ? Routes.AppStoreApiWithAuthCode : Routes.AppStoreApiWithoutAuthCode;
	const response = await instance.fetcher.post(`https://${host}/WebObjects/MZFinance.woa/wa/authenticate`, {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': Signatures.HttpHeaderUserAgent,
		},
		searchParams: {
			guid: instance.machine.guid,
		},
		body: plist.build({
			appleId: email,
			attempt: token.length > 0 ? 2 : 4,
			createSession: 'true',
			guid: instance.machine.guid,
			password: `${password}${token}`,
			rmp: '0',
			why: 'signIn',
		}),
	});
	const data = plist.parse(response.body) as {
		// eslint-disable-next-line @typescript-eslint/ban-types
		pings: [];
		failureType: FailureTypes | string;
		customerMessage: string;
		'm-allowed': boolean;
		'cancel-purchase-batch': boolean;
	};

	switch (data.failureType) {
		case FailureTypes.InvalidCredentials: {
			throw new Error(Errors.InvalidAppleIdCredentials);
		}

		case FailureTypes.PasswordTokenExpired: {
			throw new Error(Errors.PasswordTokenExpired);
		}

		case FailureTypes.TemporarilyUnavailable: {
			throw new Error(Errors.ServiceNotAvailable);
		}

		default: {
			if (data.failureType) {
				throw new Error(`IPA_LOGIN_ERROR_${data.failureType}`);
			}
		}
	}

	if (data.customerMessage === 'MZFinance.BadLogin.Configurator_message') {
		if (!data.failureType) {
			return true;
		}

		throw new Error(Errors.InvalidAppleIdCredentials);
	}

	return false;
};
