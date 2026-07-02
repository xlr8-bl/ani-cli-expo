import { useQuery } from '@tanstack/react-query';

/**
 * Jikan (MyAnimeList) fills the gap AniList leaves: complete episode title
 * lists for every show. Pages are 100 episodes — the same chunking as the
 * episode-range pills, so range N maps straight to Jikan page N+1.
 * No key required; results cached hard (titles don't change).
 */

export interface JikanEpisode {
  /** Episode number. */
  mal_id: number;
  title: string | null;
  filler: boolean;
  recap: boolean;
}

interface JikanEpisodesResponse {
  data: JikanEpisode[];
  pagination: { has_next_page: boolean; last_visible_page: number };
}

async function fetchEpisodePage(malId: number, page: number): Promise<JikanEpisode[]> {
  const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Jikan request failed (${res.status})`);
  const json = (await res.json()) as JikanEpisodesResponse;
  return json.data ?? [];
}

/** Episode titles for one 100-episode page, keyed by episode number. */
export function useEpisodeTitles(malId: number | null | undefined, page: number) {
  return useQuery({
    queryKey: ['jikan', 'episodes', malId, page],
    queryFn: () => fetchEpisodePage(malId!, page),
    enabled: typeof malId === 'number' && malId > 0 && page > 0,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
    select: (episodes) => {
      const byNumber = new Map<number, JikanEpisode>();
      for (const ep of episodes) byNumber.set(ep.mal_id, ep);
      return byNumber;
    },
  });
}