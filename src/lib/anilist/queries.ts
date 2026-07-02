/** GraphQL documents for the Home discovery feeds. */

export const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  genres
  averageScore
  format
  status
  season
  seasonYear
  episodes
  description
  nextAiringEpisode { episode airingAt }
`;

export const TRENDING_QUERY = `
  query Trending($page: Int = 1, $perPage: Int = 20) {
    Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

export const SEASON_QUERY = `
  query Seasonal($season: MediaSeason!, $year: Int!, $page: Int = 1, $perPage: Int = 20) {
    Page(page: $page, perPage: $perPage) {
      media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

export const TOP_RATED_QUERY = `
  query TopRated($page: Int = 1, $perPage: Int = 20) {
    Page(page: $page, perPage: $perPage) {
      media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

export const JUST_AIRED_QUERY = `
  query JustAired($from: Int!, $to: Int!, $page: Int = 1, $perPage: Int = 30) {
    Page(page: $page, perPage: $perPage) {
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME_DESC) {
        id
        episode
        airingAt
        media {
          ${MEDIA_FIELDS}
        }
      }
    }
  }
`;

export const DETAIL_QUERY = `
  query Detail($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
    }
  }
`;
