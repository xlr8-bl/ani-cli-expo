import { allanimeHeaders, fetchWithTimeout, DESKTOP_UA } from './client';
import type { ResolvedSource } from './types';

/**
 * Embed-host extractors. AllAnime rotates which providers it returns, and many
 * are embed pages rather than direct links, so we pull the real media URL out
 * of the common ones. mp4upload appears in nearly every response and is the
 * most reliable, so it's the priority (ported from ani-cli's mp4upload path).
 */

/** mp4upload embed → direct .mp4 (played with an mp4upload Referer). */
export async function extractMp4Upload(embedUrl: string): Promise<ResolvedSource | null> {
  const res = await fetchWithTimeout(embedUrl, { headers: allanimeHeaders() }, 8000);
  if (!res.ok) return null;
  const html = await res.text();
  const match =
    html.match(/src:\s*["']([^"']+\.mp4[^"']*)["']/i) ??
    html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i);
  if (!match) return null;
  return {
    url: match[1] ?? match[0],
    quality: 0,
    qualityLabel: 'auto',
    isM3u8: false,
    provider: 'Mp4Upload',
    headers: { Referer: 'https://www.mp4upload.com/', 'User-Agent': DESKTOP_UA },
  };
}

/** Dispatch an embed URL to the right extractor, or null if unsupported. */
export function extractorFor(url: string): ((u: string) => Promise<ResolvedSource | null>) | null {
  if (/mp4upload\.com\/embed/i.test(url)) return extractMp4Upload;
  return null;
}
