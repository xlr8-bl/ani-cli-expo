import { useQuery } from '@tanstack/react-query';
import { gql } from './client';

/**
 * Full season-chain traversal.
 *
 * AniList only returns a show's *direct* prequel/sequel, so the old one-hop
 * approach made season labels/navigation relative to whichever page you were
 * on. This walks the whole chain — back through every prequel to the root and
 * forward through every sequel to the tip — so every season page shows the
 * same complete, correctly-ordered list. Each node is cached.
 */

const SEASON_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);

const NODE_QUERY = `
  query SeasonNode($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large extraLarge color }
      episodes
      seasonYear
      format
      relations {
        edges {
          relationType
          node { id type format }
        }
      }
    }
  }
`;

interface RawNode {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { large: string | null; extraLarge: string | null; color: string | null };
  episodes: number | null;
  seasonYear: number | null;
  format: string | null;
  relations: {
    edges: { relationType: string; node: { id: number; type: string; format: string | null } }[];
  };
}

export interface SeasonNode {
  id: number;
  title: string;
  cover: string | null;
  color: string | null;
  episodes: number | null;
  label: string;
}

function bestTitle(t: RawNode['title']): string {
  return t.english ?? t.romaji ?? t.native ?? 'Untitled';
}

function neighbour(node: RawNode, relationType: 'PREQUEL' | 'SEQUEL'): number | null {
  const edge = node.relations.edges.find(
    (e) =>
      e.relationType === relationType &&
      e.node.type === 'ANIME' &&
      SEASON_FORMATS.has(e.node.format ?? ''),
  );
  return edge ? edge.node.id : null;
}

async function fetchChain(startId: number): Promise<SeasonNode[]> {
  const cache = new Map<number, RawNode>();
  const getNode = async (id: number): Promise<RawNode> => {
    const hit = cache.get(id);
    if (hit) return hit;
    const data = await gql<{ Media: RawNode }>(NODE_QUERY, { id });
    cache.set(id, data.Media);
    return data.Media;
  };

  const start = await getNode(startId);
  const seen = new Set<number>([startId]);

  // Walk back through prequels.
  const back: RawNode[] = [];
  let cur = start;
  for (let i = 0; i < 15; i++) {
    const prev = neighbour(cur, 'PREQUEL');
    if (!prev || seen.has(prev)) break;
    seen.add(prev);
    const node = await getNode(prev);
    back.unshift(node);
    cur = node;
  }

  // Walk forward through sequels.
  const fwd: RawNode[] = [];
  cur = start;
  for (let i = 0; i < 15; i++) {
    const next = neighbour(cur, 'SEQUEL');
    if (!next || seen.has(next)) break;
    seen.add(next);
    const node = await getNode(next);
    fwd.push(node);
    cur = node;
  }

  const ordered = [...back, start, ...fwd];
  const baseTitle = bestTitle(ordered[0].title);
  return ordered.map((n, i) => ({
    id: n.id,
    title: bestTitle(n.title),
    cover: n.coverImage.large ?? n.coverImage.extraLarge,
    color: n.coverImage.color,
    episodes: n.episodes,
    label: seasonLabel(bestTitle(n.title), baseTitle, i + 1),
  }));
}

/**
 * Label a season by its distinct name (the part of its title that differs from
 * the franchise base) — "Bleach" → "The Thousand-Year Blood War: The
 * Calamity". Falls back to "Season N" (chain position) when there's no
 * distinct name.
 */
function seasonLabel(entryTitle: string, baseTitle: string, ordinal: number): string {
  const base = normalizeWords(baseTitle);
  const words = entryTitle.split(/\s+/);
  const wordsNorm = normalizeWords(entryTitle);
  let common = 0;
  while (common < base.length && common < wordsNorm.length && wordsNorm[common] === base[common]) {
    common++;
  }
  const distinct = words
    .slice(common)
    .join(' ')
    .replace(/^[\s:\-–—·~]+/, '')
    .replace(/^(?:season\s*\d+|\d+(?:st|nd|rd|th)\s+season|part\s*\d+|cour\s*\d+)\s*[:\-–—·~]?\s*/i, '')
    .trim();
  if (!distinct) return `Season ${ordinal}`;
  return distinct;
}

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

export function useSeasonChain(anilistId: number | undefined) {
  return useQuery({
    queryKey: ['season-chain', anilistId],
    enabled: Boolean(anilistId),
    staleTime: 1000 * 60 * 30,
    queryFn: () => fetchChain(anilistId!),
  });
}
