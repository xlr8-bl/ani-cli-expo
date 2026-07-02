export type TranslationType = 'sub' | 'dub' | 'raw';

export interface AllAnimeShow {
  _id: string;
  name: string;
  englishName?: string | null;
  availableEpisodes?: { sub: number; dub: number; raw: number } | null;
}

/** One raw source entry from the AllAnime `episode` query. */
export interface SourceUrlEntry {
  sourceUrl: string;
  priority?: number;
  sourceName?: string;
  type?: string;
  className?: string;
  streamerId?: string;
}

/** A resolved, playable stream after de-obfuscation + clock.json resolution. */
export interface ResolvedSource {
  url: string;
  /** Numeric height (1080, 720…) when known, else 0. */
  quality: number;
  /** Display label ("1080p", "720p", "auto"). */
  qualityLabel: string;
  /** m3u8 vs mp4. */
  isM3u8: boolean;
  provider: string;
  /** Optional subtitle track url. */
  subtitle?: string | null;
  /** Headers the CDN needs (Referer/UA) when fetching the stream. */
  headers: Record<string, string>;
}
