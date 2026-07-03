import { hianimeSearch, hianimeEpisodes, hianimeSourceUrl } from '../hianime/scraper';
import { megacloudExtract } from '../hianime/megacloud';
import { hianimeHeaders } from '../hianime/client';
import { normalizeTitle } from '../allanime/match';
import { displayTitle } from '../anilist/types';
import type { MediaTitle } from '../anilist/types';
import type { SourceProvider, SourceContext, ResolvedSource } from './types';
import { HIANIME_ENABLED } from '@/config';

/** Quick title-only best match over HiAnime search results. */
function bestShow(title: MediaTitle, shows: { id: string; title: string }[]): string | null {
  const wanted = [title.english, title.romaji, title.native].filter(Boolean) as string[];
  const wantedTokens = wanted.map((w) => new Set(normalizeTitle(w).split(' ').filter(Boolean)));
  let best: { id: string; score: number } | null = null;
  for (const show of shows) {
    const st = new Set(normalizeTitle(show.title).split(' ').filter(Boolean));
    let score = 0;
    for (const wt of wantedTokens) {
      if (wt.size === 0 || st.size === 0) continue;
      let inter = 0;
      for (const t of wt) if (st.has(t)) inter++;
      score = Math.max(score, inter / Math.max(wt.size, st.size));
    }
    if (!best || score > best.score) best = { id: show.id, score };
  }
  return best && best.score >= 0.5 ? best.id : null;
}

function qualityHeight(label?: string): number {
  if (!label) return 0;
  const m = /(\d{3,4})/.exec(label);
  return m ? Number(m[1]) : 0;
}

/**
 * Experimental HiAnime provider — gives real .m3u8 + soft subtitles + sub/dub
 * when it works, but HiAnime's anti-bot and megacloud's rotating key mean it
 * can fail silently; the provider chain then falls back to AllAnime.
 */
async function resolveHiAnime(ctx: SourceContext): Promise<ResolvedSource[]> {
  const shows = await hianimeSearch(displayTitle(ctx.title));
  const showId = bestShow(ctx.title, shows);
  if (!showId) return [];

  const episodes = await hianimeEpisodes(showId);
  const ep = episodes.find((e) => e.number === ctx.episodeNumber);
  if (!ep) return [];

  const embedUrl = await hianimeSourceUrl(ep.epNum, ctx.translation === 'dub' ? 'dub' : 'sub');
  if (!embedUrl) return [];

  const { sources, subtitles } = await megacloudExtract(embedUrl);
  if (sources.length === 0) return [];

  const headers = hianimeHeaders();
  const subs = subtitles.map((s) => ({ url: s.url, lang: s.lang }));
  return sources.map((s) => {
    const height = qualityHeight(s.quality);
    return {
      url: s.url,
      quality: height,
      qualityLabel: height > 0 ? `${height}p` : (s.quality || 'auto'),
      isM3u8: s.isM3U8,
      provider: 'HiAnime',
      subtitle: subs[0]?.url ?? null,
      subtitles: subs,
      headers,
    };
  });
}

export const hiAnimeProvider: SourceProvider = {
  id: 'hianime',
  label: 'HiAnime',
  enabled: HIANIME_ENABLED,
  resolve: resolveHiAnime,
};
