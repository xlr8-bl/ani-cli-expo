import { useSourceMap } from '@/store/sourceMap';
import { searchAndMatch, getAvailableEpisodes, resolveEpisodeSources } from '../allanime/scraper';
import type { SourceProvider, SourceContext, ResolvedSource } from './types';

/**
 * In-app AllAnime provider. Runs entirely on-device (the phone's residential
 * IP), which is what lets it pass the Cloudflare walls that block datacenter
 * hosts. Matches the show once and caches the id mapping.
 */
async function resolveAllAnime(ctx: SourceContext): Promise<ResolvedSource[]> {
  const { anilistId, title, episodeNumber, translation } = ctx;
  const store = useSourceMap.getState();

  let showId = ctx.allanimeShowId ?? store.mappings[anilistId]?.allanimeId ?? null;

  if (!showId) {
    const match = await searchAndMatch(title, translation);
    if (!match) return [];
    showId = match.show._id;
    store.setMapping(anilistId, {
      allanimeId: match.show._id,
      allanimeName: match.show.name,
      manual: false,
    });
  }

  const available = await getAvailableEpisodes(showId);
  const episodeString =
    available[translation].find((e) => Number(e) === episodeNumber) ?? String(episodeNumber);

  return resolveEpisodeSources(showId, episodeString, translation);
}

export const allAnimeProvider: SourceProvider = {
  id: 'allanime',
  label: 'AllAnime',
  enabled: true,
  resolve: resolveAllAnime,
};
