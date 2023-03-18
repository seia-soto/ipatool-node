import type internal from 'stream';
import {PassThrough} from 'stream';
import AdmZip from 'adm-zip';

export const createBufferFromStream = async (stream: internal.PassThrough | internal.Readable) => new Promise<Buffer>((resolve, reject) => {
	const chunks: any[] = [];

	stream.on('data', chunk => chunks.push(chunk));
	stream.once('end', () => {
		resolve(Buffer.concat(chunks));
	});
	stream.once('error', error => {
		reject(error);
	});
});

export const createReaderFromBuffer = async (buff: Buffer) => new AdmZip(buff);

export const createWriterFromReader = async (reader: AdmZip, handler: (entry: AdmZip.IZipEntry) => Promise<void>) => {
	const duplicated = new AdmZip();

	await Promise.all(
		reader
			.getEntries()
			.map(async entry => {
				if (entry.isDirectory) {
					return;
				}

				duplicated.addFile(entry.entryName, entry.getData());

				return handler(entry);
			}),
	);

	return duplicated;
};
