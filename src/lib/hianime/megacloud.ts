import CryptoJS from 'crypto-js';
import { hianimeFetch } from './client';

/**
 * Megacloud/VidCloud extractor — the real .m3u8 + soft subtitle tracks.
 * Ported from @consumet/extensions' rapidcloud extractor (MIT).
 *
 * ⚠️ Most fragile part: megacloud's `getSources` returns either a plain source
 * list or an AES-encrypted `sources` string whose key rotates and is published
 * to community repos. We try the plain shape first, then decrypt with a fetched
 * key, then a fallback key. Any failure just means the HiAnime provider yields
 * nothing and the app falls back to AllAnime.
 */

export interface MegaSource {
  url: string;
  quality?: string;
  isM3U8: boolean;
}
export interface MegaResult {
  sources: MegaSource[];
  subtitles: { url: string; lang: string }[];
}

// Community-maintained megacloud key endpoints (they rotate/move).
const KEY_ENDPOINTS = [
  'https://raw.githubusercontent.com/itzzzme/megacloud-keys/main/key.txt',
  'https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json',
];
const FALLBACK_KEY = 'c1d17096f2ca11b7';

interface GetSourcesResponse {
  sources: string | { file: string; label?: string; type?: string }[];
  tracks?: { file: string; label?: string; kind?: string }[];
  encrypted?: boolean;
}

async function getText(url: string): Promise<string> {
  const res = await hianimeFetch(url, {}, 7000);
  if (!res.ok) throw new Error(`key ${res.status}`);
  return res.text();
}

async function fetchDecryptKey(): Promise<string | null> {
  for (const ep of KEY_ENDPOINTS) {
    try {
      const raw = (await getText(ep)).trim();
      if (!raw) continue;
      // key.txt → the raw string; keys.json → { mega/megacloud: "..." } or array
      if (raw.startsWith('{') || raw.startsWith('[')) {
        const json = JSON.parse(raw);
        const key =
          json.mega ?? json.megacloud ?? json.key ?? (Array.isArray(json) ? json[0] : null);
        if (typeof key === 'string' && key) return key;
      } else if (/^[a-z0-9]+$/i.test(raw) && raw.length >= 8) {
        return raw;
      }
    } catch {
      // try next endpoint
    }
  }
  return null;
}

function parseEmbed(embedUrl: string): { host: string; id: string } | null {
  const m = /^https?:\/\/([^/]+)\/.*\/([A-Za-z0-9_-]+)(?:\?|$)/.exec(embedUrl);
  if (!m) return null;
  return { host: m[1], id: m[2] };
}

export async function megacloudExtract(embedUrl: string): Promise<MegaResult> {
  const parsed = parseEmbed(embedUrl);
  if (!parsed) return { sources: [], subtitles: [] };
  const { host, id } = parsed;

  // Newer megacloud uses /v2/, older uses /ajax/ — try both.
  const endpoints = [
    `https://${host}/embed-2/v2/e-1/getSources?id=${id}`,
    `https://${host}/embed-2/ajax/e-1/getSources?id=${id}`,
  ];

  let data: GetSourcesResponse | null = null;
  for (const url of endpoints) {
    try {
      const res = await hianimeFetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }, 8000);
      if (!res.ok) continue;
      data = (await res.json()) as GetSourcesResponse;
      if (data) break;
    } catch {
      // try next
    }
  }
  if (!data) return { sources: [], subtitles: [] };

  let fileList: { file: string; label?: string }[] = [];

  if (Array.isArray(data.sources)) {
    fileList = data.sources;
  } else if (typeof data.sources === 'string') {
    // Encrypted string → AES decrypt with fetched key (fallback otherwise).
    const key = (await fetchDecryptKey()) ?? FALLBACK_KEY;
    try {
      const decrypted = CryptoJS.AES.decrypt(data.sources, key).toString(CryptoJS.enc.Utf8);
      const arr = JSON.parse(decrypted);
      if (Array.isArray(arr)) fileList = arr;
    } catch {
      return { sources: [], subtitles: [] };
    }
  }

  const sources: MegaSource[] = fileList
    .filter((s) => s.file)
    .map((s) => ({
      url: s.file,
      quality: s.label,
      isM3U8: s.file.includes('.m3u8'),
    }));

  const subtitles = (data.tracks ?? [])
    .filter((t) => t.file && (t.kind === 'captions' || t.kind === 'subtitles' || !t.kind))
    .map((t) => ({ url: t.file, lang: t.label ?? 'Unknown' }));

  return { sources, subtitles };
}
