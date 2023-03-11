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
	AppStoreApi = 'buy.itunes.apple.com',
	AppStoreApiWithAuthCode = 'p25-buy.itunes.apple.com',
	AppStoreApiWithoutAuthCode = 'p71-buy.itunes.apple.com',
}

export enum Signatures {
	HttpHeaderStoreFront = 'X-Set-Apple-Store-Front',
	HttpHeaderUserAgent = 'Configurator/2.15 (Macintosh; OperatingSystem X 11.0.0; 16G29) AppleWebKit/2603.3.8',
}

export enum Errors {
	InvalidAppleIdCredentials = 'IPATOOL_INVALID_APPLE_ID_CREDENTIALS',
	PasswordTokenExpired = 'IPATOOL_AUTHORIZED_SESSION_EXPIRED',
	ServiceNotAvailable = 'IPATOOL_SERVER_NOT_AVAILABLE',
}

/* eslint-disable @typescript-eslint/naming-convention */
export const storeFronts = {
	AE: '143481',
	AG: '143540',
	AI: '143538',
	AL: '143575',
	AM: '143524',
	AO: '143564',
	AR: '143505',
	AT: '143445',
	AU: '143460',
	AZ: '143568',
	BB: '143541',
	BD: '143490',
	BE: '143446',
	BG: '143526',
	BH: '143559',
	BM: '143542',
	BN: '143560',
	BO: '143556',
	BR: '143503',
	BS: '143539',
	BW: '143525',
	BY: '143565',
	BZ: '143555',
	CA: '143455',
	CH: '143459',
	CI: '143527',
	CL: '143483',
	CN: '143465',
	CO: '143501',
	CR: '143495',
	CY: '143557',
	CZ: '143489',
	DE: '143443',
	DK: '143458',
	DM: '143545',
	DO: '143508',
	DZ: '143563',
	EC: '143509',
	EE: '143518',
	EG: '143516',
	ES: '143454',
	FI: '143447',
	FR: '143442',
	GB: '143444',
	GD: '143546',
	GH: '143573',
	GR: '143448',
	GT: '143504',
	GY: '143553',
	HK: '143463',
	HN: '143510',
	HR: '143494',
	HU: '143482',
	ID: '143476',
	IE: '143449',
	IL: '143491',
	IN: '143467',
	IS: '143558',
	IT: '143450',
	JM: '143511',
	JO: '143528',
	JP: '143462',
	KE: '143529',
	KN: '143548',
	KR: '143466',
	KW: '143493',
	KY: '143544',
	KZ: '143517',
	LB: '143497',
	LC: '143549',
	LI: '143522',
	LK: '143486',
	LT: '143520',
	LU: '143451',
	LV: '143519',
	MD: '143523',
	MG: '143531',
	MK: '143530',
	ML: '143532',
	MN: '143592',
	MO: '143515',
	MS: '143547',
	MT: '143521',
	MU: '143533',
	MV: '143488',
	MX: '143468',
	MY: '143473',
	NE: '143534',
	NG: '143561',
	NI: '143512',
	NL: '143452',
	NO: '143457',
	NP: '143484',
	NZ: '143461',
	OM: '143562',
	PA: '143485',
	PE: '143507',
	PH: '143474',
	PK: '143477',
	PL: '143478',
	PT: '143453',
	PY: '143513',
	QA: '143498',
	RO: '143487',
	RS: '143500',
	RU: '143469',
	SA: '143479',
	SE: '143456',
	SG: '143464',
	SI: '143499',
	SK: '143496',
	SN: '143535',
	SR: '143554',
	SV: '143506',
	TC: '143552',
	TH: '143475',
	TN: '143536',
	TR: '143480',
	TT: '143551',
	TW: '143470',
	TZ: '143572',
	UA: '143492',
	UG: '143537',
	US: '143441',
	UY: '143514',
	UZ: '143566',
	VC: '143550',
	VE: '143502',
	VG: '143543',
	VN: '143471',
	YE: '143571',
	ZA: '143472',
};
/* eslint-enable @typescript-eslint/naming-convention */

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

/**
 * Look up an app with bundle identifier and country code
 * @param country The country code that the app has been registered for; e.g. US
 * @param bundleId The bundle identifier of the app
 * @returns First entry from the app store
 */
export const lookup = async (country: keyof typeof storeFronts, bundleId: string) => {
	const response = await got(`https://${Routes.iTunesApi}/lookup`, {
		searchParams: {
			entity: 'software,iPadSoftware',
			limit: '1',
			media: 'software',
			bundleId,
			country,
		},
	});
	const data = JSON.parse(response.body) as {
		resultCount: number;
		results: Array<{
			artworkUrl512: string;
			artistViewUrl: string;
			artworkUrl60: string;
			artworkUrl100: string;
			screenshotUrls: any[];
			ipadScreenshotUrls: any[];
			appletvScreenshotUrls: any[];
			isGameCenterEnabled: boolean;
			features: any[];
			advisories: any[];
			supportedDevices: any[];
			kind: string;
			averageUserRating: number;
			formattedPrice: string;
			averageUserRatingForCurrentVersion: number;
			userRatingCountForCurrentVersion: number;
			trackContentRating: string;
			minimumOsVersion: string;
			languageCodesISO2A: any[];
			fileSizeBytes: string;
			sellerUrl: string;
			trackCensoredName: string;
			trackViewUrl: string;
			contentAdvisoryRating: string;
			releaseNotes: string;
			artistId: number;
			artistName: string;
			genres: any[];
			price: number;
			description: string;
			currency: string;
			bundleId: string;
			releaseDate: string;
			primaryGenreName: string;
			primaryGenreId: number;
			isVppDeviceBasedLicensingEnabled: boolean;
			sellerName: string;
			genreIds: any[];
			trackId: number;
			trackName: string;
			currentVersionReleaseDate: string;
			version: string;
			wrapperType: string;
			userRatingCount: number;
		}>;
	};

	return data.results[0];
};
