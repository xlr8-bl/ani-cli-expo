/** Shared AniList media shapes used across Home/Detail. */

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface Media {
  id: number;
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

/** Best display title: english → romaji → native. */
export function displayTitle(t: MediaTitle): string {
  return t.english ?? t.romaji ?? t.native ?? 'Untitled';
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
