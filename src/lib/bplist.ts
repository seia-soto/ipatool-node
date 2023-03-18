import compileBinaryPlist from 'bplist-creator';
import binaryPlistParser from 'bplist-parser';

export {
	compileBinaryPlist,
};

export const parseBinaryPlist = <T>(buff: Buffer): T[] => binaryPlistParser.parseBuffer(buff);
