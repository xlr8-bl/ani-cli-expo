import CryptoJS from 'crypto-js';

/**
 * AllAnime response decryption — ported from ani-cli (GPL-3.0).
 *
 * Source responses now arrive as an AES-256-CTR encrypted `tobeparsed` blob
 * (base64). Layout: 1 header byte, a 12-byte IV, the ciphertext, then a
 * trailing 16 bytes we drop. The counter block is IV || 0x00000002. The key is
 * sha256("Xot36i3lK3:v1"). Verified byte-for-byte against Node's crypto.
 */

const KEY = CryptoJS.SHA256('Xot36i3lK3:v1');

function wordArrayToU8(wa: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wa;
  const out = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out;
}

function u8ToWordArray(u: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < u.length; i++) {
    words[i >>> 2] |= u[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, u.length);
}

/** Decrypt a base64 `tobeparsed` blob to its plaintext JSON string. */
export function decryptToBeParsed(b64: string): string {
  const full = wordArrayToU8(CryptoJS.enc.Base64.parse(b64));
  const iv16 = new Uint8Array(16);
  iv16.set(full.slice(1, 13)); // 12-byte IV
  iv16.set([0, 0, 0, 2], 12); // counter suffix 0x00000002
  const ciphertext = full.slice(13, full.length - 16);

  const decrypted = CryptoJS.AES.decrypt(
    // @ts-expect-error crypto-js accepts a CipherParams-like { ciphertext }
    { ciphertext: u8ToWordArray(ciphertext) },
    KEY,
    { iv: u8ToWordArray(iv16), mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding },
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}
