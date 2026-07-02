import type { AllAnimeShow, TranslationType } from './types';
import type { MediaTitle } from '../anilist/types';

/**
 * Normalize a title for comparison: lowercase, strip season/part suffixes and
 * punctuation, collapse whitespace, map common variants. AniList and AllAnime
 * name shows differently, so we token-match rather than require equality.
 */
export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(season|cour|part|the final|final season|tv|ova|ona|movie)\b/g, ' ')
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeTitle(s).split(' ').filter(Boolean));
}

/** Jaccard-ish token overlap score in [0,1]. */
function tokenScore(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

export interface MatchResult {
  show: AllAnimeShow;
  score: number;
}

/**
 * Pick the best AllAnime show for an AniList title. Considers romaji, english
 * and native; boosts exact normalized matches and shows that actually have
 * episodes in the requested translation type. Returns null below a confidence
 * floor so the UI can offer a manual "link source" fallback.
 */
export function matchShow(
  aniTitle: MediaTitle,
  candidates: AllAnimeShow[],
  translationType: TranslationType,
): MatchResult | null {
  const wanted = [aniTitle.english, aniTitle.romaji, aniTitle.native].filter(Boolean) as string[];
  const wantedNorm = wanted.map(normalizeTitle);

  let best: MatchResult | null = null;
  for (const show of candidates) {
    const names = [show.name, show.englishName].filter(Boolean) as string[];
    let score = 0;
    for (const w of wanted) {
      for (const n of names) score = Math.max(score, tokenScore(w, n));
    }
    // Exact normalized equality is a strong signal.
    for (const n of names) {
      if (wantedNorm.includes(normalizeTitle(n))) score = Math.max(score, 0.98);
    }
    // Prefer shows that actually have episodes in the requested type.
    const avail = show.availableEpisodes?.[translationType] ?? 0;
    if (avail > 0) score += 0.02;

    if (!best || score > best.score) best = { show, score };
  }

  if (!best || best.score < 0.5) return null;
  return best;
}
