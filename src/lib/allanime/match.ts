import type { AllAnimeShow, TranslationType } from './types';
import type { MediaTitle } from '../anilist/types';

/**
 * Normalize a title for comparison. Crucially this KEEPS season/part/final and
 * numbers — stripping them collapses every season of a show to the same string,
 * which is what made XLR8 play a random season. Only pure format noise
 * (tv/ova/movie…) and punctuation are removed.
 */
export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/\b(tv|ova|ona|movie|special|cour|the animation)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeTitle(s).split(' ').filter(Boolean));
}

/**
 * Similarity in [0,1]: token overlap plus a containment bonus (only when the
 * smaller title has ≥2 tokens, so a 1-word name can't spuriously match).
 * Because season words are kept, "Season 2" and the base title now differ.
 */
function tokenScore(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / Math.max(ta.size, tb.size);
  const minSize = Math.min(ta.size, tb.size);
  const containment = minSize >= 2 ? inter / minSize : 0;
  return Math.max(jaccard, containment * 0.92);
}

export interface MatchResult {
  show: AllAnimeShow;
  score: number;
}

/**
 * Pick the best AllAnime show for an AniList title. Season disambiguation
 * comes from two signals: the (season-preserving) title similarity, and
 * episode-count proximity — a season's AniList episode count should be close
 * to the matched AllAnime show's available count, which separates e.g. Bleach
 * (366) from Bleach: TYBW (13), or AoT S1 (25) from the Final Season (16).
 */
export function matchShow(
  aniTitle: MediaTitle,
  aniEpisodes: number | null | undefined,
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
    // Exact normalized equality (season words included) is the strongest name signal.
    for (const n of names) {
      if (wantedNorm.includes(normalizeTitle(n))) score = Math.max(score, 0.99);
    }

    // Episode-count proximity — the decisive season disambiguator.
    const sub = show.availableEpisodes?.[translationType] ?? 0;
    if (aniEpisodes && sub) {
      const diff = Math.abs(aniEpisodes - sub);
      const ratio = Math.min(aniEpisodes, sub) / Math.max(aniEpisodes, sub);
      if (diff === 0) score += 0.25;
      else if (diff <= 2) score += 0.12;
      else if (ratio >= 0.85) score += 0.05;
      else if (ratio < 0.5) score -= 0.25; // very different length → likely wrong season
    } else if (sub > 0) {
      score += 0.02;
    }

    if (!best || score > best.score) best = { show, score };
  }

  if (!best || best.score < 0.4) return null;
  return best;
}
