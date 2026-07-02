/**
 * XLR8 design tokens — the single source of truth for the true-black, glassy,
 * editorial theme. Extracted from the reference screenshots.
 *
 * These values are mirrored into tailwind.config.js so NativeWind class names
 * (bg-bg, text-textMuted, rounded-card, etc.) stay in sync with the raw values
 * used by components that need literal colors (BlurView tint, gradients, SVG).
 */

// --- Core surfaces -------------------------------------------------------
export const colors = {
  // Base is true/near-black, not Material dark gray — this makes cards + art pop.
  bg: '#000000',
  bgElevated: '#0A0A0A',
  // Elevated surfaces (cards): slightly lighter flat dark gray, solid fill.
  surface: '#161616',
  surfaceAlt: '#1C1C1E',
  // Hairline separators / outlined pills.
  border: '#2A2A2C',
  borderStrong: '#3A3A3C',

  // Text
  text: '#FFFFFF',
  textMuted: '#9A9A9E',
  eyebrow: '#8A8A8E',
  textInverse: '#000000',

  // XLR8 brand accent — electric blue. Used sparingly: active-tab indicator,
  // key CTAs. Never tint everything.
  accent: '#2E8BFF',
  accentDim: '#1E5FB0',

  // Semantic
  new: '#2E8BFF',
  danger: '#FF453A',
} as const;

// --- Genre / category chip palette --------------------------------------
// Flat, saturated, solid-color fills — each genre keeps a consistent color so
// browsing reads as a colorful grid, not a gray list. Reused by Search chips.
export const genreColors: Record<string, string> = {
  Action: '#8E3B52', // maroon
  Adventure: '#E24E32', // burnt orange / red
  Fantasy: '#5A3E7A', // purple
  Comedy: '#2F80ED', // blue
  Drama: '#2E7D74', // teal
  Romance: '#26406B', // navy
  'Sci-Fi': '#3A6EA5', // steel blue
  Horror: '#5B2333', // deep maroon
  Thriller: '#7A3B2E', // rust
  Mystery: '#4A3B7A', // indigo
  Supernatural: '#6A3D8E', // violet
  Sports: '#2E7D46', // green
  Music: '#B0473B', // brick
  Slice: '#C77D3B', // amber
  'Slice of Life': '#C77D3B', // amber
  Psychological: '#3B4A6B', // slate blue
  Mecha: '#4B4E55', // gunmetal
  Ecchi: '#A63D6A', // rose
  Seinen: '#3B5E5A', // dark teal
  Shounen: '#B5482E', // orange-red
  Shoujo: '#A6486A', // pink-maroon
  Isekai: '#4A5E2E', // olive
} as const;

// Fallback color for any genre not explicitly mapped (deterministic by name).
const genreFallbacks = [
  '#8E3B52',
  '#E24E32',
  '#5A3E7A',
  '#2F80ED',
  '#2E7D74',
  '#26406B',
  '#7A3B2E',
  '#4A3B7A',
];

export function genreColor(name: string): string {
  if (genreColors[name]) return genreColors[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return genreFallbacks[hash % genreFallbacks.length];
}

// --- Radii ---------------------------------------------------------------
export const radius = {
  card: 22,
  chip: 14,
  pill: 999,
  sheet: 28,
} as const;

// --- Typography families -------------------------------------------------
// Loaded via expo-font in the root layout. Serif = editorial hero/synopsis;
// rounded sans = all UI text, headings, labels, buttons.
export const fonts = {
  serif: 'SourceSerif4',
  serifItalic: 'SourceSerif4Italic',
  sans: 'NunitoSans',
  sansBold: 'NunitoSansBold',
  sansExtra: 'NunitoSansExtra',
} as const;

// --- Glass / blur --------------------------------------------------------
export const glass = {
  // BlurView intensity for the floating nav + sticky header.
  navIntensity: 40,
  headerIntensity: 30,
  // tint keeps the true-black feel showing through the frost.
  tint: 'dark' as const,
};

export type GenreName = keyof typeof genreColors;
