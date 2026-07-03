import Constants from 'expo-constants';

/**
 * Optional self-hosted Consumet server (see /server). When set, XLR8 tries it
 * first for source resolution and falls back to the in-app AllAnime scraper.
 * When blank, only AllAnime is used. Set it via app.json → expo.extra
 * .consumetBaseUrl, or hardcode below after deploying.
 */
export const CONSUMET_BASE_URL: string =
  ((Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.consumetBaseUrl as string) ||
  '';

/** Default Consumet provider (HiAnime = best subs/quality). */
export const CONSUMET_PROVIDER = 'hianime';

/**
 * Experimental in-app HiAnime provider (real .m3u8 + soft subtitles + dub).
 * Tried before AllAnime when on; silently falls back to AllAnime if HiAnime's
 * anti-bot or megacloud decryption fails.
 */
export const HIANIME_ENABLED = true;
