/**
 * Minimal AniList GraphQL client. No key required.
 * https://graphql.anilist.co — metadata & discovery only; streams come from
 * a separate source layer (later milestone).
 */

const ENDPOINT = 'https://graphql.anilist.co';

export class AniListError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'AniListError';
  }
}

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new AniListError(`AniList request failed (${res.status})`, res.status);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new AniListError(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) {
    throw new AniListError('AniList returned no data');
  }
  return json.data;
}

// --- Season helpers -------------------------------------------------------

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export function currentSeason(date = new Date()): { season: Season; year: number } {
  const m = date.getMonth() + 1;
  const year = date.getFullYear();
  if (m <= 3) return { season: 'WINTER', year };
  if (m <= 6) return { season: 'SPRING', year };
  if (m <= 9) return { season: 'SUMMER', year };
  return { season: 'FALL', year };
}

export function nextSeason(date = new Date()): { season: Season; year: number } {
  const order: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const cur = currentSeason(date);
  const i = order.indexOf(cur.season);
  return i === 3
    ? { season: 'WINTER', year: cur.year + 1 }
    : { season: order[i + 1], year: cur.year };
}
