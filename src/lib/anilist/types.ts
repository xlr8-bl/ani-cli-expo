/** Shared AniList media shapes used across Home/Detail. */

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface Media {
  id: number;
  idMal: number | null;
  title: MediaTitle;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  };
  bannerImage: string | null;
  genres: string[];
  averageScore: number | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  /** Average episode length in minutes. */
  duration: number | null;
  description: string | null;
  nextAiringEpisode: {
    episode: number;
    airingAt: number;
  } | null;
}

export interface AiringItem {
  id: number;
  episode: number;
  airingAt: number;
  media: Media;
}

export interface StreamingEpisode {
  title: string | null;
  thumbnail: string | null;
  url: string | null;
  site: string | null;
}

export interface RelationNode extends Media {
  type: 'ANIME' | 'MANGA';
}

export interface RelationEdge {
  relationType: string;
  node: RelationNode;
}

export interface CharacterEdge {
  role: string;
  node: {
    id: number;
    name: { full: string };
    image: { large: string | null };
  };
  voiceActors: {
    id: number;
    name: { full: string };
    image: { large: string | null };
  }[];
}

/** Full detail payload — Media plus episodes/relations/cast. */
export interface MediaDetail extends Media {
  streamingEpisodes: StreamingEpisode[];
  relations: { edges: RelationEdge[] };
  characters: { edges: CharacterEdge[] };
}

// Filler words stay lowercase mid-title ("Attack on Titan", "Fist of the
// North Star") but are capitalized when they lead the title.
const MINOR_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'as',
  'of',
  'to',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'no',
  'wa',
  'ni',
  'vs',
  'via',
]);

// Valid roman numerals (II, III, IV, IX…) keep their caps — but not words
// that merely use roman letters (e.g. "mix").
const ROMAN_RE = /^(?=[mdclxvi])m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

/**
 * Show titles render in Title Case everywhere — never ALL CAPS ("ONE PIECE"
 * → "One Piece"), with filler words lowercase and numerals left alone.
 */
export function titleCase(s: string): string {
  const words = s.toLowerCase().split(/\s+/);
  let capitalizeNext = true; // first word, and words after ":" / "-" / "~"
  return words
    .map((w) => {
      const lead = capitalizeNext;
      capitalizeNext = /[:\-~—]$/.test(w);
      const core = w.replace(/[^a-z0-9]/g, '');
      if (ROMAN_RE.test(core)) return w.toUpperCase();
      if (!lead && MINOR_WORDS.has(core)) return w;
      const i = w.search(/[a-z]/);
      if (i === -1) return w; // digits/punctuation only
      return w.slice(0, i) + w[i].toUpperCase() + w.slice(i + 1);
    })
    .join(' ');
}

/** Best display title (english → romaji → native), normalized to Title Case. */
export function displayTitle(t: MediaTitle): string {
  const raw = t.english ?? t.romaji ?? t.native ?? 'Untitled';
  return titleCase(raw);
}

/** "FALL" → "Fall", "RELEASING" → "Releasing", "NOT_YET_RELEASED" → "Not yet released". */
export function sentenceCaseEnum(v: string | null): string | null {
  if (!v) return null;
  const s = v.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Media format for display — acronyms stay caps, the rest sentence case. */
export function formatLabel(format: string | null): string | null {
  if (!format) return null;
  const map: Record<string, string> = {
    TV: 'TV',
    TV_SHORT: 'TV Short',
    MOVIE: 'Movie',
    SPECIAL: 'Special',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Music',
  };
  return map[format] ?? sentenceCaseEnum(format);
}

/** AniList description is HTML-ish; strip tags for plain rendering. */
export function plainDescription(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
