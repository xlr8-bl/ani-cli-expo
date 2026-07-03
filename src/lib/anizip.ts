import { useQuery } from '@tanstack/react-query';

/**
 * ani.zip aggregates per-episode metadata (TVDB/MAL/AniList) keyed directly
 * by AniList id — the third source in the episode-name chain, and a rich
 * source of per-episode stills for shows AniList's streamingEpisodes window
 * doesn't cover. One request per show, no key.
 */

export interface AniZipEpisode {
  number: number;
  title: string | null;
  image: string | null;
  airDate: string | null;
}

interface AniZipResponse {
  episodes?: Record<
    string,
    {
      title?: Record<string, string | null> | null;
      image?: string | null;
      airDate?: string | null;
      airdate?: string | null;
    }
  >;
}

function cleanTitle(t: string | null | undefined): string | null {
  if (!t) return null;
  const s = t.replace(/`/g, "'").trim();
  // TVDB placeholder names are worse than our own fallback.
  if (/^episode\s+\d+$/i.test(s)) return null;
  if (/^untitled$/i.test(s)) return null;
  return s || null;
}

async function fetchAniZip(anilistId: number): Promise<Map<number, AniZipEpisode>> {
  const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`ani.zip request failed (${res.status})`);
  const json = (await res.json()) as AniZipResponse;
  const map = new Map<number, AniZipEpisode>();
  for (const [key, ep] of Object.entries(json.episodes ?? {})) {
    const number = Number(key);
    if (!Number.isFinite(number) || number < 1) continue; // skips specials like "S1"
    const titles = ep.title ?? {};
    map.set(number, {
      number,
      title: cleanTitle(titles['en'] ?? titles['x-jat'] ?? titles['ja']),
      image: ep.image ?? null,
      airDate: ep.airDate ?? ep.airdate ?? null,
    });
  }
  return map;
}

/** Per-episode titles/stills for a whole show, keyed by episode number. */
export function useAniZipEpisodes(anilistId: number | null | undefined) {
  return useQuery({
    queryKey: ['anizip', anilistId],
    queryFn: () => fetchAniZip(anilistId!),
    enabled: typeof anilistId === 'number' && anilistId > 0,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 2,
  });
}