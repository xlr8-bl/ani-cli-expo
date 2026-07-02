import type { MediaDetail } from './anilist/types';

export interface Episode {
  number: number;
  /** Episode title without the "Episode N -" prefix, when known. */
  title: string | null;
  /** Real per-episode still where AniList has one; null → use cover art. */
  thumbnail: string | null;
  site: string | null;
  isNew: boolean;
}

const EP_NUM_RE = /episode\s*(\d+)\s*(?:[-–—:]\s*)?/i;

/**
 * Build the full 1..N episode list for a show.
 *
 * AniList's `streamingEpisodes` carries real per-episode thumbnails/titles but
 * only for a window (e.g. 69 of One Piece's 1100+), and `episodes` is null
 * while a show is releasing — the aired count then comes from
 * `nextAiringEpisode.episode - 1`. So: synthesize the full range and overlay
 * the real stills where they exist.
 */
export function buildEpisodeList(media: MediaDetail): Episode[] {
  const aired = media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : null;
  let total = media.episodes ?? aired ?? 0;

  const byNumber = new Map<number, { title: string | null; thumbnail: string | null; site: string | null }>();
  for (const se of media.streamingEpisodes ?? []) {
    const m = se.title ? EP_NUM_RE.exec(se.title) : null;
    if (!m) continue;
    const num = Number(m[1]);
    if (!Number.isFinite(num) || num < 1) continue;
    const cleanTitle = se.title!.replace(EP_NUM_RE, '').trim() || null;
    if (!byNumber.has(num)) byNumber.set(num, { title: cleanTitle, thumbnail: se.thumbnail, site: se.site });
    total = Math.max(total, num);
  }

  // A weekly releasing show whose next episode airs within 7 days means the
  // previous one just aired — that's the NEW badge.
  const now = Math.floor(Date.now() / 1000);
  const newEpisode =
    media.status === 'RELEASING' &&
    media.nextAiringEpisode &&
    media.nextAiringEpisode.airingAt - 7 * 86400 <= now
      ? media.nextAiringEpisode.episode - 1
      : null;

  const list: Episode[] = [];
  for (let n = 1; n <= total; n++) {
    const real = byNumber.get(n);
    list.push({
      number: n,
      title: real?.title ?? null,
      thumbnail: real?.thumbnail ?? null,
      site: real?.site ?? null,
      isNew: n === newEpisode,
    });
  }
  return list;
}

/** Chunk episodes into range pages ("1–100", "101–200"…) for very long shows. */
export function episodeRanges(count: number, size = 100): { label: string; start: number; end: number }[] {
  const ranges = [];
  for (let start = 1; start <= count; start += size) {
    const end = Math.min(start + size - 1, count);
    ranges.push({ label: `${start}–${end}`, start, end });
  }
  return ranges;
}