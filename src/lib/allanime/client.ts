/**
 * AllAnime GraphQL client — ported from ani-cli (GPL-3.0).
 * Endpoint api.allanime.day/api; requires a Referer of https://allanime.to and
 * a desktop Chrome User-Agent. Queries are sent as GET with url-encoded
 * `variables` + `query`, exactly as ani-cli does.
 */

export const ALLANIME_API = 'https://api.allanime.day/api';
export const ALLANIME_REFERER = 'https://allanime.to';
export const ALLANIME_BASE = 'https://allanime.day';
export const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Headers every AllAnime request needs; also used for the CDN link fetches. */
export function allanimeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Referer: ALLANIME_REFERER,
    'User-Agent': DESKTOP_UA,
    ...extra,
  };
}

export class AllAnimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AllAnimeError';
  }
}

/** Run an AllAnime GraphQL query (GET with url-encoded variables + query). */
export async function allanimeQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const url =
    `${ALLANIME_API}?variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&query=${encodeURIComponent(query)}`;

  const res = await fetch(url, { headers: allanimeHeaders() });
  if (!res.ok) throw new AllAnimeError(`AllAnime request failed (${res.status})`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new AllAnimeError(json.errors.map((e) => e.message).join('; '));
  if (!json.data) throw new AllAnimeError('AllAnime returned no data');
  return json.data;
}
