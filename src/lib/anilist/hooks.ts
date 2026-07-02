import { useQuery } from '@tanstack/react-query';
import { gql, currentSeason } from './client';
import {
  TRENDING_QUERY,
  SEASON_QUERY,
  TOP_RATED_QUERY,
  JUST_AIRED_QUERY,
  DETAIL_QUERY,
} from './queries';
import type { AiringItem, Media, MediaDetail } from './types';

interface PageMedia {
  Page: { media: Media[] };
}
interface PageAiring {
  Page: { airingSchedules: AiringItem[] };
}

const STALE = 1000 * 60 * 10; // discovery feeds don't need to be fresher than 10m

export function useTrending() {
  return useQuery({
    queryKey: ['anilist', 'trending'],
    queryFn: () => gql<PageMedia>(TRENDING_QUERY, { perPage: 20 }),
    staleTime: STALE,
    select: (d) => d.Page.media,
  });
}

export function usePopularThisSeason() {
  const { season, year } = currentSeason();
  return useQuery({
    queryKey: ['anilist', 'season', season, year],
    queryFn: () => gql<PageMedia>(SEASON_QUERY, { season, year, perPage: 20 }),
    staleTime: STALE,
    select: (d) => d.Page.media,
  });
}

export function useTopRated() {
  return useQuery({
    queryKey: ['anilist', 'top-rated'],
    queryFn: () => gql<PageMedia>(TOP_RATED_QUERY, { perPage: 20 }),
    staleTime: STALE,
    select: (d) => d.Page.media,
  });
}

/**
 * Episodes that aired in the last `days` days (default 7) — the source of the
 * NEW badge. De-duplicated to the most recent episode per show.
 */
export function useJustAired(days = 7) {
  return useQuery({
    queryKey: ['anilist', 'just-aired', days],
    queryFn: () => {
      const now = Math.floor(Date.now() / 1000);
      return gql<PageAiring>(JUST_AIRED_QUERY, {
        from: now - days * 86400,
        to: now,
        perPage: 40,
      });
    },
    staleTime: 1000 * 60 * 5,
    select: (d) => {
      const seen = new Set<number>();
      const out: AiringItem[] = [];
      for (const item of d.Page.airingSchedules) {
        if (!item.media || item.media.genres == null) continue;
        if (seen.has(item.media.id)) continue;
        seen.add(item.media.id);
        out.push(item);
      }
      return out;
    },
  });
}

export function useAnimeDetail(id: number) {
  return useQuery({
    queryKey: ['anilist', 'detail', id],
    queryFn: () => gql<{ Media: MediaDetail }>(DETAIL_QUERY, { id }),
    staleTime: STALE,
    select: (d) => d.Media,
    enabled: Number.isFinite(id) && id > 0,
  });
}
