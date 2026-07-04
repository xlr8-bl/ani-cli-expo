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
import { matchShow, MatchResult } from './match';
import type { MediaTitle } from '../anilist/types';
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

/**
 * Find the best AllAnime show for an AniList title. Searches by romaji first
 * (AllAnime names shows in romaji), and if the match is weak, also searches by
 * english and re-matches over the merged candidates — this rescues newer shows
 * whose english title barely overlaps the provider's romaji name.
 */
export async function searchAndMatch(
  title: MediaTitle,
  aniEpisodes: number | null | undefined,
  translationType: TranslationType,
): Promise<MatchResult | null> {
  const queries = [title.romaji, title.english, title.native].filter(
    (q, i, arr): q is string => Boolean(q) && arr.indexOf(q) === i,
  );
  if (queries.length === 0) return null;

  const byId = new Map<string, AllAnimeShow>();
  let best: MatchResult | null = null;

  for (const query of queries.slice(0, 2)) {
    const edges = await searchShows(query, translationType);
    for (const e of edges) byId.set(e._id, e);
    best = matchShow(title, aniEpisodes, [...byId.values()], translationType);
    // A near-exact hit (name + episode count) means we can stop early.
    if (best && best.score >= 0.95) break;
  }
  return best;
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
  if (fallback && /auto/i.test(fallback)) return 'Auto';
  return fallback?.trim() || 'Auto';
}

/** True for the fast4speed direct-CDN source — our universal, always-playable stream. */
function isFast4(url: string, provider?: string): boolean {
  return /fast4speed\.rsvp/i.test(url) || /yt-?mp4/i.test(provider ?? '');
}

/**
 * A decoded source URL is directly playable only if it's an actual media file
 * or a known direct-CDN host that streams without auth. fast4speed is the
 * universal one (a seekable mp4 on every episode); wixmp is a clean direct CDN.
 * SharePoint's download.aspx and myanimelist need auth/cookies and never play in
 * the native player, so they're excluded — surfacing them only hid the working
 * fast4speed source behind a dead link. Embed pages (mp4upload, filemoon…) are
 * handled by extractors, not here.
 */
function isPlayableDirect(url: string): boolean {
  if (/\.(m3u8|mp4)(\?|$)/i.test(url)) return true;
  return /(fast4speed\.rsvp|wixmp\.com)/i.test(url);
}

/**
 * Expand an HLS master playlist into its real quality variants (1080p/720p…).
 * A master lists `#EXT-X-STREAM-INF` variant streams; we turn each into its own
 * selectable source pointing at that variant's media playlist, plus keep the
 * master itself as an adaptive "Auto". Media playlists (a single stream) and any
 * fetch failure fall back to the source unchanged, so playback is never lost.
 */
async function expandHlsVariants(source: ResolvedSource): Promise<ResolvedSource[]> {
  if (!source.isM3u8) return [source];
  try {
    const res = await fetchWithTimeout(source.url, { headers: source.headers }, 6000);
    if (!res.ok) return [source];
    const text = await res.text();
    if (!text.includes('#EXT-X-STREAM-INF')) return [source]; // media playlist, single stream
    const lines = text.split(/\r?\n/);
    const variants: { height: number; bandwidth: number; url: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^#EXT-X-STREAM-INF/i.test(lines[i])) continue;
      const res2 = /RESOLUTION=\d+x(\d+)/i.exec(lines[i]);
      const bw = /BANDWIDTH=(\d+)/i.exec(lines[i]);
      let uri = '';
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j].trim();
        if (l && !l.startsWith('#')) {
          uri = l;
          break;
        }
      }
      if (!uri) continue;
      try {
        variants.push({
          height: res2 ? Number(res2[1]) : 0,
          bandwidth: bw ? Number(bw[1]) : 0,
          url: new URL(uri, source.url).toString(),
        });
      } catch {
        /* skip malformed variant URI */
      }
    }
    if (variants.length === 0) return [source];
    // Master first (adaptive Auto — the slow-network friendly pick), then
    // distinct heights high→low, each carrying its real bitrate.
    const peak = Math.max(...variants.map((v) => v.bandwidth), 0);
    const out: ResolvedSource[] = [
      { ...source, quality: 0, qualityLabel: 'Auto', adaptive: true, bandwidth: peak || undefined },
    ];
    const seen = new Set<number>();
    for (const v of variants.sort((a, b) => b.height - a.height)) {
      if (seen.has(v.height)) continue;
      seen.add(v.height);
      out.push({
        ...source,
        url: v.url,
        quality: v.height,
        qualityLabel: qualityLabel(v.height),
        bandwidth: v.bandwidth || undefined,
        adaptive: false,
      });
    }
    return out;
  } catch {
    return [source];
  }
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
      const fast4 = isFast4(candidate, provider);
      results.push({
        url: candidate,
        quality: 0,
        qualityLabel: 'Auto',
        isM3u8: /\.m3u8(\?|$)/i.test(candidate),
        provider: fast4 ? 'Direct' : provider,
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

  // Expand any HLS master into its real quality variants (1080p/720p…) so the
  // quality menu shows true resolutions, not just source names. Direct mp4s and
  // media playlists pass through untouched.
  const expanded = (
    await Promise.allSettled(results.map(expandHlsVariants))
  ).flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  const sorted = dedupeAndSort(expanded);
  await attachDirectSizes(sorted);
  return sorted;
}

/**
 * Fill in the exact byte size of direct (non-HLS) streams from their
 * content-length, so the quality menu can show real "size to stream". A single
 * ranged request per file; best-effort and bounded, so a slow probe never
 * blocks playback. HLS variants advertise a bitrate instead (handled in the UI).
 */
async function attachDirectSizes(sources: ResolvedSource[]): Promise<void> {
  const targets = sources.filter((s) => !s.isM3u8).slice(0, 3);
  await Promise.allSettled(
    targets.map(async (s) => {
      try {
        const res = await fetchWithTimeout(
          s.url,
          { headers: { ...s.headers, Range: 'bytes=0-0' } },
          4000,
        );
        const total = Number((res.headers.get('content-range') ?? '').split('/')[1]);
        if (Number.isFinite(total) && total > 0) s.sizeBytes = total;
      } catch {
        /* size stays unknown — the menu just omits it */
      }
    }),
  );
}

/**
 * Order sources for reliable playback with real quality choices.
 *
 * fast4speed ("Direct") is the one source present and playable on essentially
 * every episode — it's a seekable mp4 the native player streams cleanly — so it
 * leads as the default autoplay pick and is *never* hidden. Everything else
 * (HLS variants with real heights, mp4upload) is offered after it, highest
 * resolution first, so the quality menu still exposes 1080p/720p when a provider
 * actually serves them.
 */
function dedupeAndSort(sources: ResolvedSource[]): ResolvedSource[] {
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  const fast4 = (s: ResolvedSource) => isFast4(s.url, s.provider);
  // Reliability tiebreaker at equal quality: resolved HLS/mp4 over anything else.
  const rank = (s: ResolvedSource): number => {
    if (/mp4upload/i.test(s.provider)) return 2;
    if (s.isM3u8) return 3;
    return 1;
  };
  return unique.sort((a, b) => {
    const fa = fast4(a) ? 1 : 0;
    const fb = fast4(b) ? 1 : 0;
    if (fa !== fb) return fb - fa; // fast4speed first — the reliable default
    if (b.quality !== a.quality) return b.quality - a.quality; // then real quality, high→low
    return rank(b) - rank(a);
  });
}

export { AllAnimeError };
