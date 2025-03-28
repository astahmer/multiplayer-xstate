// Taken from https://github.com/facebook/stylex/blob/f1e494d3f20cc72d83db2929af371437b322c09d/packages/shared/src/hash.js
// @ts-nocheck

/**
 * JS Implementation of MurmurHash2
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} str ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
function murmurhash2_32_gc(str: string, seed = 0) {
	let l = str.length;
	let h = seed ^ l;
	let i = 0;
	let k;

	while (l >= 4) {
		k =
			(str.charCodeAt(i) & 0xff) |
			((str.charCodeAt(++i) & 0xff) << 8) |
			((str.charCodeAt(++i) & 0xff) << 16) |
			((str.charCodeAt(++i) & 0xff) << 24);

		k = (k & 0xffff) * 0x5bd1e995 + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);
		k ^= k >>> 24;
		k = (k & 0xffff) * 0x5bd1e995 + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);

		h = ((h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

		l -= 4;
		++i;
	}

	switch (l) {
		case 3:
			h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
		case 2:
			h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
		case 1:
			h ^= str.charCodeAt(i) & 0xff;
			h = (h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
	}

	h ^= h >>> 13;
	h = (h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
	h ^= h >>> 15;

	return h >>> 0;
}

const hash = (str: string): string => murmurhash2_32_gc(str, 1).toString(36);

export default hash as (str: string) => string;
