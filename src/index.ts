import got, {type ExtendOptions, type Got} from 'got';
import path from 'path';
import plist from 'plist';
import {CookieJar} from 'tough-cookie';
import {compileBinaryPlist} from './lib/bplist.js';
import {createReaderFromBuffer, createWriterFromReader} from './lib/zip.js';

export enum FailureTypes {
	InvalidCredentials = '-5000',
	PasswordTokenExpired = '2034',
	LicenseNotFound = '9610',
	TemporarilyUnavailable = '2059',
}

export enum Routes {
	iTunesApi = 'https://itunes.apple.com',
	AppStoreApi = 'https://buy.itunes.apple.com',
	AppStoreApiWithAuthCode = 'https://p25-buy.itunes.apple.com',
	AppStoreApiWithoutAuthCode = 'https://p71-buy.itunes.apple.com',
}

export enum Signatures {
	HttpHeaderStoreFront = 'X-Set-Apple-Store-Front',
	HttpHeaderUserAgent = 'Configurator/2.15 (Macintosh; OperatingSystem X 11.0.0; 16G29) AppleWebKit/2603.3.8',
}

export enum Errors {
	InvalidCredentials = 'IPATOOL_INVALID_CREDENTIALS',
	ServiceUnavailable = 'IPATOOL_SERVICE_UNAVAILABLE',
	SessionUnavailable = 'IPATOOL_SESSION_UNAVAILABLE',
	SessionExpired = 'IPATOOL_SESSION_EXPIRED',
	LicenseUnavailable = 'IPATOOL_LICENSE_UNAVAILABLE',
	LicenseAlreadyExists = 'IPATOOL_LICENSE_ALREADY_EXISTS',
	PayloadSinfUnavailable = 'IPATOOL_SINF_UNAVAILABLE',
	PayloadInfoUnavailable = 'IPATOOL_INFO_UNAVAILABLE',
	PayloadBundleNameUnavailable = 'IPATOOL_BUNDLENAME_UNAVAILABLE',
	UnknownFailureType = 'IPATOOL_FAILURE_TYPE_',
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
	session?: {
		directoryServicePersonId: string;
		token: string;
	};
};

export type InstanceSerialized = Omit<Instance, 'fetcher' | 'cookies'> & {
	cookies: CookieJar.Serialized;
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
	const fetcherOptions: ExtendOptions = {
		headers: {
			'User-Agent': Signatures.HttpHeaderUserAgent,
		},
		ignoreInvalidCookies: true,
	};

	if (serializedInstance) {
		const cookieJar = await CookieJar.deserialize(serializedInstance.cookies);
		const fetcher = got.extend({
			...fetcherOptions,
			cookieJar,
		});

		const instance: Instance = {
			...serializedInstance,
			fetcher,
			cookies: cookieJar,
		};

		return instance;
	}

	const cookieJar = new CookieJar(undefined, {
		looseMode: true,
	});
	const fetcher = got.extend({
		...fetcherOptions,
		cookieJar,
	});

	const instance: Instance = {
		fetcher,
		cookies: cookieJar,
		machine: {
			guid: createGuid(),
		},
	};

	return instance;
};

/**
 * Serializes the instance to JSON-safe format
 * @param instance The instance
 * @returns The object containing information to be deserialized with the `createInstance` method.
 */
export const serializeInstance = async (instance: Instance) => {
	const serialized: InstanceSerialized & Partial<Omit<Instance, 'cookies'>> = {
		...instance,
		cookies: await instance.cookies.serialize(),
	};

	delete serialized.fetcher;

	return serialized as InstanceSerialized;
};

export type ResponseSignInFailed = {
	pings: any[];
	failureType: FailureTypes | string;
	customerMessage: string;
	'm-allowed': false;
	'cancel-purchase-batch': boolean;
};

export type ResponseSignInSuccess = {
	pings: any[];
	accountInfo: {
		appleId: string;
		address: {
			firstName: string;
			lastName: string;
		};
	};
	altDsid: string;
	passwordToken: string;
	clearToken: string;
	'm-allowed': true;
	'family-id': string;
	dsPersonId: string;
	creditDisplay: string;
	creditBalance: string;
	freeSongBalance: string;
	isManagedStudent: boolean;
	action: {
		kind: string;
	};
	subscriptionStatus: {
		terms: Array<{
			type: string;
			latestTerms: number;
			agreedToTerms: number;
			source: string;
		}>;
		account: {
			isMinor: boolean;
			suspectUnderage: boolean;
		};
		family: {
			hasFamily: boolean;
			hasFamilyGreaterThanOneMember: boolean;
			isHoH: boolean;
		};
	};
	accountFlags: {
		personalization: boolean;
		underThirteen: boolean;
		identityLastVerified: number;
		verifiedExpirationDate: number;
		retailDemo: boolean;
		autoPlay: boolean;
		isDisabledAccount: boolean;
		isRestrictedAccount: boolean;
		isManagedAccount: boolean;
		isInRestrictedRegion: boolean;
		accountFlagsVersion: number;
		isInBadCredit: boolean;
		hasAgreedToTerms: boolean;
		hasAgreedToAppClipTerms: boolean;
		hasWatchHardwareOffer: boolean;
		isInFamily: boolean;
		hasSubscriptionFamilySharingEnabled: boolean;
	};
	status: number;
	'download-queue-info': {
		dsid: number;
		'is-auto-download-machine': boolean;
	};
	privacyAcknowledgement: {
		'com.apple.onboarding.podcasts': number;
		'com.apple.onboarding.tvapp': number;
		'com.apple.onboarding.ibooks': number;
		'com.apple.onboarding.appstore': number;
		'com.apple.onboarding.applemusic': number;
		'com.apple.onboarding.itunesstore': number;
		'com.apple.onboarding.itunesu': number;
		'com.apple.onboarding.videos': number;
		'com.apple.onboarding.appleid': number;
		'com.apple.onboarding.applearcade': number;
		'com.apple.onboarding.atve.tv': number;
	};
	dialog: {
		'm-allowed': boolean;
		message: string;
		explanation: string;
		defaultButton: string;
		okButtonString: string;
		initialCheckboxValue: boolean;
	};
};

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
	const response = await instance.fetcher.post('WebObjects/MZFinance.woa/wa/authenticate', {
		prefixUrl: token ? Routes.AppStoreApiWithAuthCode : Routes.AppStoreApiWithoutAuthCode,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
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
	const data = plist.parse(response.body) as ResponseSignInFailed | ResponseSignInSuccess;

	if (!data['m-allowed']) {
		if (!data.failureType && data.customerMessage === 'MZFinance.BadLogin.Configurator_message') {
			return true;
		}

		switch (data.failureType) {
			case FailureTypes.InvalidCredentials: {
				throw new Error(Errors.InvalidCredentials);
			}

			case FailureTypes.TemporarilyUnavailable: {
				throw new Error(Errors.ServiceUnavailable);
			}

			default: {
				throw new Error(Errors.UnknownFailureType + data.failureType);
			}
		}
	}

	instance.session = {
		directoryServicePersonId: data.dsPersonId,
		token: data.passwordToken,
	};

	return data;
};

export type LookupResponseSuccess = {
	resultCount: number;
	results: Array<{
		artworkUrl512: string;
		artistViewUrl: string;
		artworkUrl60: string;
		artworkUrl100: string;
		screenshotUrls: string[];
		ipadScreenshotUrls: string[];
		appletvScreenshotUrls: string[];
		isGameCenterEnabled: boolean;
		features: any[];
		advisories: any[];
		supportedDevices: string[];
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

/**
 * Look up an app with bundle identifier and country code
 * @param instance The instance
 * @param country The country code that the app has been registered for; e.g. US
 * @param bundleId The bundle identifier of the app
 * @returns Entries from the app store
 */
export const lookup = async (instance: Instance, country: keyof typeof storeFronts, bundleId: string, limits = 1) => {
	const response = await instance.fetcher('lookup', {
		prefixUrl: Routes.iTunesApi,
		searchParams: {
			entity: 'software,iPadSoftware',
			limit: limits.toString(),
			media: 'software',
			bundleId,
			country,
		},
	});
	const data = JSON.parse(response.body) as LookupResponseSuccess;

	return data.results;
};

/**
 * Search an app with keyword and country code
 * @param instance The instance
 * @param country The country code that the app has been registered for; e.g. US
 * @param keyword The keyword to search
 * @returns Entries from the app store
 */
export const search = async (instance: Instance, country: keyof typeof storeFronts, keyword: string, limits = 1) => {
	const response = await instance.fetcher('search', {
		prefixUrl: Routes.iTunesApi,
		searchParams: {
			entity: 'software,iPadSoftware',
			limit: limits.toString(),
			media: 'software',
			term: keyword,
			country,
		},
	});
	const data = JSON.parse(response.body) as LookupResponseSuccess;

	return data.results;
};

export type PermitLicenseResponseFailed = {
	pings: any[];
	metrics: {
		dialogId: string;
		message: string;
		messageCode: string;
		options: string[];
		actionUrl: string;
		asnState: number;
		eventType: string;
	};
	failureType: string;
	customerMessage: string;
	'm-allowed': boolean;
	dialog: {
		kind: string;
		'm-allowed': boolean;
		'use-keychain': boolean;
		message: string;
		explanation: string;
		defaultButton: string;
		okButtonString: string;
		okButtonAction: {
			kind: string;
			buyParams: string;
			itemName: string;
		};
		cancelButtonString: string;
		initialCheckboxValue: boolean;
	};
	'cancel-purchase-batch': boolean;
};

export type PermitLicenseResponseSuccess = {
	pings: any[];
	jingleDocType: string;
	jingleAction: string;
	status: number;
	dsPersonId: string;
	creditDisplay: string;
	creditBalance: string;
	freeSongBalance: string;
	authorized: boolean;
	'download-queue-item-count': number;
	songList: Array<{
		songId: number;
		URL: string;
		downloadKey: string;
		artworkURL: string;
		'artwork-urls': {
			'image-type': string;
			default: {
				url: string;
			};
		};
		md5: string;
		chunks: {
			chunkSize: number;
			hashes: string[];
		};
		isStreamable: boolean;
		uncompressedSize: string;
		sinfs: Array<{
			id: number;
			sinf: Buffer;
		}>;
		purchaseDate: string;
		'download-id': string;
		'is-in-queue': boolean;
		'asset-info': {
			'file-size': number;
			flavor: string;
		};
		metadata: {
			MacUIRequiredDeviceCapabilities: {
				arm64: boolean;
			};
			UIRequiredDeviceCapabilities: {
				arm64: boolean;
			};
			WKRunsIndependentlyOfCompanionApp: boolean;
			WKWatchOnly: boolean;
			appleWatchEnabled: boolean;
			artistId: number;
			artistName: string;
			bundleDisplayName: string;
			bundleShortVersionString: string;
			bundleVersion: string;
			copyright: string;
			fileExtension: string;
			gameCenterEnabled: boolean;
			gameCenterEverEnabled: boolean;
			genre: string;
			genreId: number;
			itemId: number;
			itemName: string;
			kind: string;
			playlistName: string;
			'product-type': string;
			rating: {
				content: string;
				label: string;
				rank: number;
				system: string;
			};
			releaseDate: string;
			requiresRosetta: boolean;
			runsOnAppleSilicon: boolean;
			runsOnIntel: boolean;
			s: number;
			'software-platform': string;
			softwareIcon57x57URL: string;
			softwareIconNeedsShine: boolean;
			softwareSupportedDeviceIds: number[];
			softwareVersionBundleId: string;
			softwareVersionExternalIdentifier: number;
			softwareVersionExternalIdentifiers: number[];
			vendorId: number;
			drmVersionNumber: number;
			versionRestrictions: number;
			hasOrEverHasHadIAP: boolean;
		};
	}>;
	metrics: {
		itemIds: number[];
		currency: string;
		exchangeRateToUSD: number;
	};
};

type PurchaseLicenseResponseSuccess = {
	pings: any[];
	jingleDocType: string;
	jingleAction: string;
	status: number;
	dsPersonId: string;
	creditDisplay: string;
	creditBalance: string;
	freeSongBalance: string;
	authorized: boolean;
	'download-queue-item-count': number;
	songList: any[];
	metrics: {
		itemIds: number[];
		price: number;
		priceType: string;
		productTypes: string[];
		currency: string;
		exchangeRateToUSD: number;
		extractedCommerceEvent_latestLineItem_sapType: string;
		commerceEvent_purchase_priceType: string;
		commerceEvent_storeFrontId: string;
		extractedCommerceEvent_latestLineItem_adamId: string;
		extractedCommerceEvent_latestLineItem_currencyCodeISO3A: string;
		commerceEvent_result_resultType: number;
		extractedCommerceEvent_latestLineItem_amountPaid: number;
		commerceEvent_flowType: number;
		commerceEvent_flowStep: number;
	};
	duAnonymousPings: string[];
	subscriptionStatus: {
		terms: Array<{
			type: string;
			latestTerms: number;
			agreedToTerms: number;
			source: string;
		}>;
		account: {
			isMinor: boolean;
			suspectUnderage: boolean;
		};
		family: {
			hasFamily: boolean;
		};
	};
};

type PurchaseLicenseResponseFailed = {
	jingleDocType: string;
	failureType: string;
	status: number;
};

/**
 * Purchase license
 * @param instance The instance
 * @param appId The application identifier
 */
export const purchaseLicense = async (instance: Instance, country: keyof typeof storeFronts, appId: number, isArcadeApp: boolean) => {
	if (!instance.session) {
		throw new Error(Errors.SessionUnavailable);
	}

	const response = await instance.fetcher('WebObjects/MZBuy.woa/wa/buyProduct', {
		prefixUrl: Routes.AppStoreApi,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-apple-plist',
			'iCloud-DSID': instance.session.directoryServicePersonId,
			'X-Dsid': instance.session.directoryServicePersonId,
			'X-Apple-Store-Front': storeFronts[country],
			'X-Token': instance.session.token,
		},
		body: plist.build({
			appExtVrsId: '0',
			hasAskedToFulfillPreorder: 'true',
			buyWithoutAuthorization: 'true',
			hasDoneAgeCheck: 'true',
			guid: instance.machine.guid,
			needDiv: '0',
			origPage: `Software-${appId}`,
			origPageLocation: 'Buy',
			price: '0',
			pricingParameters: isArcadeApp ? 'GAME' : 'STDQ',
			productType: 'C',
			salableAdamId: appId,
		}),
	});
	const data = plist.parse(response.body) as PurchaseLicenseResponseSuccess | PurchaseLicenseResponseFailed;

	// @ts-expect-error This is used to determine the union type
	const hasFailed = <T extends typeof data>(reflection: T): reflection is T & PurchaseLicenseResponseFailed => typeof reflection.failureType === 'string' || data.jingleDocType !== 'purchaseSuccess' || reflection.status !== 0;

	if (hasFailed(data)) {
		if (data.status === 500) {
			throw new Error(Errors.LicenseAlreadyExists);
		}

		switch (data.failureType) {
			case FailureTypes.TemporarilyUnavailable: {
				throw new Error(Errors.ServiceUnavailable);
			}

			case FailureTypes.PasswordTokenExpired: {
				throw new Error(Errors.SessionExpired);
			}

			default: {
				throw new Error(`${Errors.UnknownFailureType}${data.failureType}:${data.status}`);
			}
		}
	}

	return data;
};

/**
 * Permit license to acquire license metadata
 * @param instance The instance
 * @param appId The application identifier
 * @param versionId The application version identifier
 * @returns The license metadata acquired from Apple server including to the download url of raw IPA and patch information
 */
export const permitLicense = async (instance: Instance, appId: number, versionId = '0') => {
	if (!instance.session) {
		throw new Error(Errors.SessionUnavailable);
	}

	const response = await instance.fetcher('WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct', {
		prefixUrl: Routes.AppStoreApiWithoutAuthCode,
		method: 'POST',
		searchParams: {
			guid: instance.machine.guid,
		},
		headers: {
			'Content-Type': 'application/x-apple-plist',
			'iCloud-DSID': instance.session.directoryServicePersonId,
			'X-Dsid': instance.session.directoryServicePersonId,
		},
		body: plist.build({
			creditDisplay: '',
			guid: instance.machine.guid,
			salableAdamId: appId,
			appExtVrsId: versionId,
		}),
	});
	const data = plist.parse(response.body) as PermitLicenseResponseFailed | PermitLicenseResponseSuccess;

	// @ts-expect-error This is used to determine the union type
	const hasFailed = <T extends typeof data>(reflection: T): reflection is T & PermitLicenseResponseFailed => typeof reflection.failureType === 'string';

	if (hasFailed(data)) {
		switch (data.failureType) {
			case FailureTypes.PasswordTokenExpired: {
				throw new Error(Errors.SessionExpired);
			}

			case FailureTypes.LicenseNotFound: {
				throw new Error(Errors.LicenseUnavailable);
			}

			default: {
				throw new Error(Errors.UnknownFailureType + data.failureType);
			}
		}
	}

	return data;
};

/**
 * Patch raw IPA using given metadata
 * @param payload The raw IPA payload in Buffer; We never support streams as it's ZIP format
 * @param license The license metadata
 * @returns The patched IPA in Buffer
 */
export const patchPayload = async (payload: Buffer, license: PermitLicenseResponseSuccess['songList'][number]) => {
	let manifest: Buffer | undefined;
	let info: Buffer | undefined;
	let bundle: string | undefined;

	const reader = await createReaderFromBuffer(payload);
	const writer = await createWriterFromReader(reader, async entry => {
		if (entry.entryName.endsWith('.app/SC_Info/Manifest.plist')) {
			manifest = entry.getData();

			return;
		}

		if (entry.entryName.includes('.app/Info.plist')) {
			if (entry.entryName.endsWith('.app/Info.plist') && !entry.entryName.includes('/Watch/')) {
				// -'.app/Info.plist'.length
				bundle = path.basename(entry.entryName.slice(0, -15));
			}
		}
	});

	writer.addFile('iTunesMetadata.plist', compileBinaryPlist(license.metadata));

	if (!bundle) {
		throw new Error(Errors.PayloadBundleNameUnavailable);
	}

	if (manifest) {
		const payload = plist.parse(manifest.toString()) as {
			SinfPaths: string[];
			SinfReplicationPaths: string[];
		};

		for (const sinfEntry of license.sinfs) {
			if (!payload.SinfPaths[sinfEntry.id]) {
				throw new Error(Errors.PayloadSinfUnavailable);
			}

			// Explicit `Buffer.from` allows us to use stringified Buffer objects via JSON.stringify
			writer.addFile(`Payload/${bundle}.app/${payload.SinfPaths[sinfEntry.id]}`, Buffer.from(sinfEntry.sinf));
		}
	} else {
		if (!info) {
			throw new Error(Errors.PayloadInfoUnavailable);
		}

		const payload = plist.parse(info.toString()) as {
			CFBundleExecutable: string;
		};

		writer.addFile(`Payload/${bundle}/SC_Info/${payload.CFBundleExecutable}.sinf`, license.sinfs[0].sinf);
	}

	return writer.toBuffer();
};
