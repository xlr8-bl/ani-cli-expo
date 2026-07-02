import { CONSUMET_BASE_URL, CONSUMET_PROVIDER } from '@/config';
import { fetchWithTimeout } from '../allanime/client';
import type { SourceProvider, SourceContext, ResolvedSource } from './types';

/**
 * Optional self-hosted Consumet provider. Enabled only when CONSUMET_BASE_URL
 * is configured (see /server). One /info request maps the AniList id to the
 * provider's episodes; one /watch request returns ready streams.
 */

interface ConsumetInfo {
  episodes?: { id: string; number: number }[];
}
interface ConsumetWatch {
  sources?: { url: string; quality?: string; isM3U8?: boolean }[];
  subtitles?: { url: string; lang?: string }[];
  headers?: Record<string, string>;
}

function parseQuality(s?: string): number {
  if (!s) return 0;
  const m = /(\d{3,4})/.exec(s);
  return m ? Number(m[1]) : 0;
}

function pickSubtitle(subs?: { url: string; lang?: string }[]): string | null {
  if (!subs?.length) return null;
  const en = subs.find((s) => /english/i.test(s.lang ?? ''));
  return (en ?? subs[0]).url ?? null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 12000);
  if (!res.ok) throw new Error(`Consumet ${res.status}`);
  return (await res.json()) as T;
}

async function resolveConsumet(ctx: SourceContext): Promise<ResolvedSource[]> {
  const base = CONSUMET_BASE_URL.replace(/\/$/, '');
  const provider = CONSUMET_PROVIDER;

  const info = await fetchJson<ConsumetInfo>(
    `${base}/meta/anilist/info/${ctx.anilistId}?provider=${provider}`,
  );
  const ep = info.episodes?.find((e) => Number(e.number) === ctx.episodeNumber);
  if (!ep) return [];

  const dub = ctx.translation === 'dub' ? '&dub=true' : '';
  const watch = await fetchJson<ConsumetWatch>(
    `${base}/meta/anilist/watch/${encodeURIComponent(ep.id)}?provider=${provider}${dub}`,
  );

  const headers = watch.headers ?? {};
  const subtitle = pickSubtitle(watch.subtitles);

  return (watch.sources ?? [])
    .filter((s) => s.url)
    .map((s) => {
      const height = parseQuality(s.quality);
      return {
        url: s.url,
        quality: height,
        qualityLabel: height > 0 ? `${height}p` : (s.quality || 'auto'),
        isM3u8: Boolean(s.isM3U8) || /\.m3u8(\?|$)/i.test(s.url),
        provider: 'Consumet',
        subtitle,
        headers,
      };
    });
}

export const consumetProvider: SourceProvider = {
  id: 'consumet',
  label: 'Consumet',
  enabled: CONSUMET_BASE_URL.length > 0,
  resolve: resolveConsumet,
};
