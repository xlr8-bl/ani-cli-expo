/**
 * AllAnime scraping — search → episodes → source resolution.
 * Ported from ani-cli (GPL-3.0). See decode.ts for the de-obfuscation.
 */
import {
  allanimeQuery,
  allanimeHeaders,
  fetchWithTimeout,
  ALLANIME_BASE,
  AllAnimeError,
} from './client';
import { decodeSourceUrl, isObfuscated, clockJsonUrl } from './decode';
import type {
  AllAnimeShow,
  SourceUrlEntry,
  ResolvedSource,
  TranslationType,
} from './types';

const SEARCH_GQL = `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){edges{_id name englishName availableEpisodes __typename}}}`;

const EPISODES_GQL = `query($showId:String!){show(_id:$showId){_id availableEpisodesDetail}}`;

const SOURCES_GQL = `query($showId:String!,$translationType:VaildTranslationTypeEnumType!,$episodeString:String!){episode(showId:$showId,translationType:$translationType,episodeString:$episodeString){episodeString sourceUrls}}`;

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
  const data = await allanimeQuery<{
    episode: { episodeString: string; sourceUrls: SourceUrlEntry[] };
  }>(SOURCES_GQL, { showId, translationType, episodeString });

  const allEntries = data.episode?.sourceUrls ?? [];
  // Highest-priority providers first (ani-cli orders by descending priority),
  // then cap: resolving every provider's clock.json is what makes this slow.
  // The top handful covers the useful qualities.
  const entries = allEntries
    .slice()
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 6);

  const results: ResolvedSource[] = [];
  // allSettled + per-fetch timeout: one dead provider can't stall the rest.
  await Promise.allSettled(
    entries.map(async (entry) => {
      const raw = entry.sourceUrl;
      if (!raw) return;
      const provider = entry.sourceName ?? 'source';
      try {
        if (isObfuscated(raw)) {
          const decoded = decodeSourceUrl(raw);
          if (decoded.includes('/clock')) {
            const links = await resolveClockLinks(decoded, provider);
            results.push(...links);
          } else if (/^https?:/i.test(decoded)) {
            // Directly playable decoded URL.
            const isM3u8 = /\.m3u8(\?|$)/i.test(decoded);
            results.push({
              url: decoded,
              quality: 0,
              qualityLabel: 'auto',
              isM3u8,
              provider,
              headers: allanimeHeaders(),
            });
          }
        } else if (/^https?:/i.test(raw)) {
          const isM3u8 = /\.m3u8(\?|$)/i.test(raw);
          results.push({
            url: raw,
            quality: 0,
            qualityLabel: 'auto',
            isM3u8,
            provider,
            headers: allanimeHeaders(),
          });
        }
      } catch {
        // A single provider failing must not kill the whole resolution.
      }
    }),
  );

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
