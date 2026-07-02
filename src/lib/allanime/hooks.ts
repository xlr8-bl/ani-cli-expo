import { useQuery } from '@tanstack/react-query';
import { useSourceMap } from '@/store/sourceMap';
import { searchShows, getAvailableEpisodes, resolveEpisodeSources } from './scraper';
import { matchShow } from './match';
import { displayTitle } from '../anilist/types';
import type { MediaTitle } from '../anilist/types';
import type { TranslationType, AllAnimeShow, ResolvedSource } from './types';

/**
 * Resolve (and cache) the AllAnime show id for an AniList title. Uses the
 * persisted mapping first; on a miss, searches AllAnime and token-matches.
 * Returns the id plus a low-confidence flag so the UI can offer manual linking.
 */
export function useAllAnimeShow(
  anilistId: number | undefined,
  title: MediaTitle | undefined,
  translationType: TranslationType,
) {
  const mappings = useSourceMap((s) => s.mappings);
  const setMapping = useSourceMap((s) => s.setMapping);
  const cached = anilistId ? mappings[anilistId] : undefined;

  return useQuery({
    queryKey: ['allanime', 'show', anilistId, translationType, cached?.allanimeId],
    enabled: Boolean(anilistId && title),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (cached) {
        return { id: cached.allanimeId, name: cached.allanimeName, confident: true, manual: cached.manual };
      }
      const query = displayTitle(title!);
      const candidates = await searchShows(query, translationType);
      const match = matchShow(title!, candidates, translationType);
      if (!match) {
        return { id: null, name: null, confident: false, manual: false, candidates };
      }
      setMapping(anilistId!, {
        allanimeId: match.show._id,
        allanimeName: match.show.name,
        manual: false,
      });
      return { id: match.show._id, name: match.show.name, confident: match.score >= 0.85, manual: false };
    },
  });
}

/** Available episode identifiers for a matched AllAnime show. */
export function useAllAnimeEpisodes(showId: string | null | undefined) {
  return useQuery({
    queryKey: ['allanime', 'episodes', showId],
    enabled: Boolean(showId),
    staleTime: 1000 * 60 * 15,
    queryFn: () => getAvailableEpisodes(showId!),
  });
}

/**
 * Resolve playable sources for one episode. Disabled until explicitly enabled
 * (episodes resolve on tap, not on render) to avoid hammering AllAnime.
 */
export function useEpisodeSources(
  showId: string | null | undefined,
  episodeString: string | null,
  translationType: TranslationType,
  enabled: boolean,
) {
  return useQuery<ResolvedSource[]>({
    queryKey: ['allanime', 'sources', showId, episodeString, translationType],
    enabled: Boolean(showId && episodeString && enabled),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    queryFn: () => resolveEpisodeSources(showId!, episodeString!, translationType),
  });
}

export type { AllAnimeShow };
