import { useQuery } from '@tanstack/react-query';
import { consumetProvider } from './consumet';
import { hiAnimeProvider } from './hianime';
import { allAnimeProvider } from './allanime';
import type { SourceContext, ResolvedSource, SourceProvider } from './types';

export type { SourceContext, ResolvedSource } from './types';

/**
 * Source providers in priority order:
 *   Consumet (self-hosted server, if configured) → HiAnime (in-app, real
 *   subs/dub/quality when it works) → AllAnime (always-available fallback).
 * Each is tried until one yields streams.
 */
const PROVIDERS: SourceProvider[] = [consumetProvider, hiAnimeProvider, allAnimeProvider];

export interface ResolveResult {
  sources: ResolvedSource[];
  provider: string;
}

/** Try each enabled provider in order; return the first that yields sources. */
export async function resolveEpisode(ctx: SourceContext): Promise<ResolveResult> {
  let lastError: unknown = null;
  for (const provider of PROVIDERS) {
    if (!provider.enabled) continue;
    try {
      const sources = await provider.resolve(ctx);
      if (sources.length > 0) return { sources, provider: provider.label };
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return { sources: [], provider: '' };
}

/** Resolve a specific episode's sources on demand (disabled until enabled). */
export function useEpisodeSources(ctx: SourceContext | null, enabled: boolean) {
  return useQuery<ResolveResult>({
    queryKey: [
      'sources',
      ctx?.anilistId,
      ctx?.episodeNumber,
      ctx?.translation,
      ctx?.allanimeShowId,
    ],
    enabled: Boolean(ctx && enabled),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    queryFn: () => resolveEpisode(ctx!),
  });
}
