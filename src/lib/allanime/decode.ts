/**
 * AllAnime source de-obfuscation — ported from ani-cli (GPL-3.0).
 *
 * Provider source URLs come `--`-prefixed as a hex string. Decode two hex
 * chars at a time into a byte and XOR each byte with 56 (0x38); the result is
 * the provider path. If that path points at `/clock`, it must be rewritten to
 * `/clock.json` against the allanime.day host to fetch the real link list.
 */

const XOR_KEY = 0x38;

/** Decode a `--`-prefixed obfuscated AllAnime source URL to its provider path. */
export function decodeSourceUrl(raw: string): string {
  let hex = raw;
  if (hex.startsWith('--')) hex = hex.slice(2);
  if (hex.length % 2 !== 0) return raw; // not the hex format we expect

  let out = '';
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return raw;
    out += String.fromCharCode(byte ^ XOR_KEY);
  }
  return out;
}

/** True when a source URL is in the obfuscated `--`hex format. */
export function isObfuscated(raw: string): boolean {
  return raw.startsWith('--');
}

/**
 * Turn a decoded provider path into the absolute clock.json endpoint.
 * `/apivtwo/clock?id=…` → `https://allanime.day/apivtwo/clock.json?id=…`
 */
export function clockJsonUrl(decodedPath: string, host = 'https://allanime.day'): string {
  const path = decodedPath.replace('/clock', '/clock.json');
  if (path.startsWith('http')) return path.replace('/clock', '/clock.json');
  return host + (path.startsWith('/') ? path : `/${path}`);
}
