/**
 * AllAnime GraphQL client — ported from ani-cli (GPL-3.0), kept in sync with
 * its live request contract:
 *   - endpoint https://api.allanime.day/api
 *   - Referer https://youtu-chan.com  (AllAnime moved off allanime.to)
 *   - a desktop Firefox User-Agent
 *   - requests are POSTed as JSON ({ variables, query })
 */

export const ALLANIME_API = 'https://api.allanime.day/api';
export const ALLANIME_REFERER = 'https://youtu-chan.com';
export const ALLANIME_BASE = 'https://allanime.day';
export const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0';

/** Headers every AllAnime request needs; also used for the CDN link fetches. */
export function allanimeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Referer: ALLANIME_REFERER,
    Origin: ALLANIME_REFERER,
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

/**
 * fetch with a hard timeout — a hung provider must never stall resolution
 * forever. Aborts the request after `ms` and rejects.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 9000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Run an AllAnime GraphQL query (POST JSON, matching ani-cli). */
export async function allanimeQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 9000,
): Promise<T> {
  const res = await fetchWithTimeout(
    ALLANIME_API,
    {
      method: 'POST',
      headers: allanimeHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ variables, query }),
    },
    timeoutMs,
  );
  if (!res.ok) throw new AllAnimeError(`AllAnime request failed (${res.status})`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new AllAnimeError(json.errors.map((e) => e.message).join('; '));
  if (!json.data) throw new AllAnimeError('AllAnime returned no data');
  return json.data;
}
