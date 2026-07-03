/**
 * HiAnime scraping client — ported from @consumet/extensions (MIT), adapted to
 * run in-app with fetch (no got-scraping/cheerio).
 *
 * ⚠️ Experimental. HiAnime is aggressively bot-protected and its megacloud
 * source decryption uses a rotating key, so this can break without notice. It
 * runs first when enabled but always falls back to the AllAnime provider.
 */

export const HIANIME_BASE = 'https://hianime.to';
export const HIANIME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function hianimeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'User-Agent': HIANIME_UA,
    Referer: `${HIANIME_BASE}/`,
    'X-Requested-With': 'XMLHttpRequest',
    ...extra,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function hianimeGetText(url: string, extra?: Record<string, string>): Promise<string> {
  const res = await fetchWithTimeout(url, { headers: hianimeHeaders(extra) }, 9000);
  if (!res.ok) throw new Error(`HiAnime ${res.status}`);
  return res.text();
}

export async function hianimeGetJson<T>(url: string, extra?: Record<string, string>): Promise<T> {
  const res = await fetchWithTimeout(url, { headers: hianimeHeaders(extra) }, 9000);
  if (!res.ok) throw new Error(`HiAnime ${res.status}`);
  return (await res.json()) as T;
}

export { fetchWithTimeout as hianimeFetch };
