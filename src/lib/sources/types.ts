import type { MediaTitle } from '../anilist/types';
import type { ResolvedSource, TranslationType } from '../allanime/types';

export type { ResolvedSource, TranslationType };

/** Everything a source provider needs to resolve one episode. */
export interface SourceContext {
  anilistId: number;
  title: MediaTitle;
  episodeNumber: number;
  /** Total episodes in this season — used to disambiguate seasons on match. */
  totalEpisodes?: number | null;
  translation: TranslationType;
  /** AllAnime show id if already matched, so the AllAnime provider can skip search. */
  allanimeShowId?: string | null;
}

/** A source of playable streams. Providers are tried in order until one hits. */
export interface SourceProvider {
  id: string;
  label: string;
  /** True when this provider is usable in the current build/config. */
  enabled: boolean;
  resolve(ctx: SourceContext): Promise<ResolvedSource[]>;
}
