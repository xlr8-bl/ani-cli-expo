/**
 * HiAnime provider flow — search → episodes → server → source embed.
 * Ported from @consumet/extensions (MIT); cheerio selectors replaced with
 * regex so it runs in React Native.
 */
import { HIANIME_BASE, hianimeGetText, hianimeGetJson } from './client';

export interface HiAnimeShow {
  id: string; // slug incl. trailing numeric id, e.g. "frieren-...-18542"
  title: string;
}

export interface HiAnimeEpisode {
  number: number;
  /** "<slug>?ep=<epNum>" form used by the servers endpoint. */
  epNum: string;
}

/** Search HiAnime; returns show slugs + titles from the results grid. */
export async function hianimeSearch(query: string): Promise<HiAnimeShow[]> {
  const html = await hianimeGetText(
    `${HIANIME_BASE}/search?keyword=${encodeURIComponent(query)}&page=1`,
    { 'X-Requested-With': '' },
  );
  const shows: HiAnimeShow[] = [];
  const seen = new Set<string>();
  // Each result: <a href="/<slug>" ... class="dynamic-name" ... title="...">
  const re = /<a[^>]+href="\/([a-z0-9-]+-\d+)"[^>]*class="[^"]*dynamic-name[^"]*"[^>]*title="([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    shows.push({ id, title: decodeHtml(m[2]) });
  }
  return shows;
}

/** Episode list for a show (ajax) — returns episode numbers + server keys. */
export async function hianimeEpisodes(showId: string): Promise<HiAnimeEpisode[]> {
  const numericId = showId.split('-').pop();
  const data = await hianimeGetJson<{ html: string }>(
    `${HIANIME_BASE}/ajax/v2/episode/list/${numericId}`,
    { Referer: `${HIANIME_BASE}/watch/${showId}` },
  );
  const eps: HiAnimeEpisode[] = [];
  // <a ... href="/watch/<slug>?ep=<epNum>" data-number="N" ...>
  const re = /href="\/watch\/([a-z0-9-]+\?ep=\d+)"[^>]*data-number="(\d+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(data.html))) {
    eps.push({ number: Number(m[2]), epNum: m[1] });
  }
  return eps;
}

/** Resolve the megacloud embed URL for an episode + sub/dub. */
export async function hianimeSourceUrl(
  epNum: string,
  subOrDub: 'sub' | 'dub',
): Promise<string | null> {
  const episodeNum = epNum.split('?ep=')[1];
  const serversData = await hianimeGetJson<{ html: string }>(
    `${HIANIME_BASE}/ajax/v2/episode/servers?episodeId=${episodeNum}`,
  );
  const serverId = retrieveServerId(serversData.html, subOrDub);
  if (!serverId) return null;
  const src = await hianimeGetJson<{ link: string; type: string }>(
    `${HIANIME_BASE}/ajax/v2/episode/sources?id=${serverId}`,
  );
  return src.link ?? null;
}

/**
 * Find the VidCloud/megacloud (data-server-id=1) server's data-id within the
 * sub or dub block. Falls back to the raw block if the requested type is
 * missing (raw = newest upload).
 */
function retrieveServerId(html: string, subOrDub: 'sub' | 'dub'): string | null {
  for (const kind of [subOrDub, 'raw']) {
    const block = sliceBlock(html, `servers-${kind}`);
    if (!block) continue;
    // <div class="server-item" ... data-server-id="1" ... data-id="<id>">
    const re = /data-server-id="1"[^>]*data-id="(\d+)"|data-id="(\d+)"[^>]*data-server-id="1"/i;
    const m = re.exec(block);
    if (m) return m[1] ?? m[2] ?? null;
  }
  return null;
}

/** Rough slice of the html between a `servers-<kind>` marker and the next block. */
function sliceBlock(html: string, marker: string): string | null {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const next = html.indexOf('servers-', start + marker.length);
  return html.slice(start, next === -1 ? undefined : next);
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
