/**
 * AllAnime scraping — search → episodes → source resolution.
 * Ported from ani-cli (GPL-3.0). See decode.ts for the de-obfuscation.
 */
import {
  allanimeQuery,
  allanimeHeaders,
  fetchWithTimeout,
  ALLANIME_API,
  ALLANIME_BASE,
  AllAnimeError,
} from './client';
import { decodeSourceUrl, isObfuscated, clockJsonUrl } from './decode';
import { decryptToBeParsed } from './crypto';
import { extractorFor } from './extractors';
import type {
  AllAnimeShow,
  SourceUrlEntry,
  ResolvedSource,
  TranslationType,
} from './types';

const SEARCH_GQL = `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){edges{_id name englishName availableEpisodes __typename}}}`;

const EPISODES_GQL = `query($showId:String!){show(_id:$showId){_id availableEpisodesDetail}}`;

// AllAnime serves episode sources only via this persisted query (the plain
// query errors server-side); the payload comes back AES-encrypted.
const SOURCES_PERSISTED_HASH = 'd405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec';

interface EpisodePayload {
  episode?: { episodeString: string; sourceUrls: SourceUrlEntry[] } | null;
}

/** Fetch an episode's sourceUrls via the persisted query, decrypting if needed. */
async function fetchSourceUrls(
  showId: string,
  translationType: TranslationType,
  episodeString: string,
): Promise<SourceUrlEntry[]> {
  const variables = JSON.stringify({ showId, translationType, episodeString });
  const extensions = JSON.stringify({
    persistedQuery: { version: 1, sha256Hash: SOURCES_PERSISTED_HASH },
  });
  const url =
    `${ALLANIME_API}?variables=${encodeURIComponent(variables)}` +
    `&extensions=${encodeURIComponent(extensions)}`;

  const res = await fetchWithTimeout(url, { headers: allanimeHeaders() }, 9000);
  if (!res.ok) throw new AllAnimeError(`AllAnime sources failed (${res.status})`);

  const json = (await res.json()) as {
    data?: (EpisodePayload & { tobeparsed?: string }) | null;
  };
  const data = json.data;
  if (!data) return [];

  // Plain response, or the encrypted `tobeparsed` variant.
  let payload: EpisodePayload | null = data.episode !== undefined ? data : null;
  if ((!payload || !payload.episode) && data.tobeparsed) {
    try {
      payload = JSON.parse(decryptToBeParsed(data.tobeparsed)) as EpisodePayload;
    } catch {
      payload = null;
    }
  }
  return payload?.episode?.sourceUrls ?? [];
}

// --- Search ---------------------------------------------------------------

export async function searchShows(
  query: string,
  translationType: TranslationType = 'sub',
): Promise<AllAnimeShow[]> {
  const data = await allanimeQuery<{ shows: { edges: AllAnimeShow[] } }>(SEARCH_GQL, {
    search: { allowAdult: false, allowUnknown: false, query },
    limit: 40,
    page: 1,
    translationType,
    countryOrigin: 'ALL',
  });
  return data.shows.edges ?? [];
}

// --- Episode list ---------------------------------------------------------

/** Available episode identifiers per translation type, numerically sorted. */
export async function getAvailableEpisodes(
  showId: string,
): Promise<Record<TranslationType, string[]>> {
  const data = await allanimeQuery<{
    show: { availableEpisodesDetail: Record<string, string[]> };
  }>(EPISODES_GQL, { showId });
  const detail = data.show?.availableEpisodesDetail ?? {};
  const sortNum = (a: string, b: string) => Number(a) - Number(b);
  return {
    sub: [...(detail.sub ?? [])].sort(sortNum),
    dub: [...(detail.dub ?? [])].sort(sortNum),
    raw: [...(detail.raw ?? [])].sort(sortNum),
  };
}

// --- Source resolution ----------------------------------------------------

interface ClockLink {
  link?: string;
  hls?: boolean;
  mp4?: boolean;
  resolutionStr?: string;
  src?: string;
  subtitles?: { src?: string; lang?: string }[];
}

/** Parse "1080", "1080p", "auto", "Q 720" etc. into a numeric height. */
function parseQuality(s?: string): number {
  if (!s) return 0;
  const m = /(\d{3,4})/.exec(s);
  return m ? Number(m[1]) : 0;
}

function qualityLabel(height: number, fallback?: string): string {
  if (height > 0) return `${height}p`;
  if (fallback && /auto/i.test(fallback)) return 'auto';
  return fallback?.trim() || 'auto';
}

/**
 * A decoded source URL is directly playable only if it's an actual media file
 * or a known direct-CDN host. Embed pages (mp4upload, filemoon…) need HTML
 * scraping we don't do, so they're skipped rather than surfaced as dead links.
 */
function isPlayableDirect(url: string): boolean {
  if (/\.(m3u8|mp4)(\?|$)/i.test(url)) return true;
  return /(fast4speed\.rsvp|wixmp\.com|sharepoint\.com|myanimelist)/i.test(url);
}

/** Fetch and flatten one provider's clock.json link list into resolved sources. */
async function resolveClockLinks(decodedPath: string, provider: string): Promise<ResolvedSource[]> {
  const url = clockJsonUrl(decodedPath, ALLANIME_BASE);
  const res = await fetchWithTimeout(url, { headers: allanimeHeaders() }, 7000);
  if (!res.ok) return [];
  const json = (await res.json()) as { links?: ClockLink[] };
  const headers = allanimeHeaders();

  const out: ResolvedSource[] = [];
  for (const l of json.links ?? []) {
    const link = l.link ?? l.src;
    if (!link) continue;
    const isM3u8 = Boolean(l.hls) || /\.m3u8(\?|$)/i.test(link);
    const height = parseQuality(l.resolutionStr);
    out.push({
      url: link,
      quality: height,
      qualityLabel: qualityLabel(height, l.resolutionStr),
      isM3u8,
      provider,
      subtitle: l.subtitles?.[0]?.src ?? null,
      headers,
    });
  }
  return out;
}

/**
 * Resolve every playable source for an episode, best quality first.
 * De-obfuscates each sourceUrl, fetches its clock.json link list, and flattens.
 */
export async function resolveEpisodeSources(
  showId: string,
  episodeString: string,
  translationType: TranslationType,
): Promise<ResolvedSource[]> {
  const entries = await fetchSourceUrls(showId, translationType, episodeString);

  const results: ResolvedSource[] = [];
  const clockPaths: string[] = [];
  const embedUrls: string[] = [];

  // Decode everything. Direct URLs (e.g. the fast4speed Yt-mp4) need no
  // network. /clock providers need a clock.json fetch. Embed pages
  // (mp4upload…) need an extractor. AllAnime rotates which it returns, so we
  // handle all three to keep playback reliable.
  for (const entry of entries) {
    const raw = entry.sourceUrl;
    if (!raw) continue;
    const provider = entry.sourceName ?? 'source';
    const candidate = isObfuscated(raw) ? decodeSourceUrl(raw) : raw;
    if (candidate.includes('/clock')) {
      clockPaths.push(candidate);
    } else if (/^https?:/i.test(candidate) && isPlayableDirect(candidate)) {
      results.push({
        url: candidate,
        quality: 0,
        qualityLabel: 'auto',
        isM3u8: /\.m3u8(\?|$)/i.test(candidate),
        provider,
        headers: allanimeHeaders(),
      });
    } else if (/^https?:/i.test(candidate) && extractorFor(candidate)) {
      embedUrls.push(candidate);
    }
  }

  // Resolve clock + embed providers in parallel (bounded), each with its own
  // timeout — a dead provider can't stall the rest.
  const tasks: Promise<ResolvedSource[]>[] = [
    ...clockPaths.slice(0, 6).map((p) => resolveClockLinks(p, 'clock')),
    ...embedUrls.slice(0, 4).map(async (u) => {
      const extract = extractorFor(u);
      const src = extract ? await extract(u) : null;
      return src ? [src] : [];
    }),
  ];
  const settled = await Promise.allSettled(tasks);
  for (const r of settled) {
    if (r.status === 'fulfilled') results.push(...r.value);
  }

  return dedupeAndSort(results);
}

/** Drop duplicate URLs; sort by quality desc, mp4 before hls at equal quality. */
function dedupeAndSort(sources: ResolvedSource[]): ResolvedSource[] {
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
  return unique.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return Number(a.isM3u8) - Number(b.isM3u8);
  });
}

export { AllAnimeError };
