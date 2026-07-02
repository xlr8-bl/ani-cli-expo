/** @type {import('tailwindcss').Config} */
// Mirrors src/theme/tokens.ts. Keep these in sync.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        bgElevated: '#0A0A0A',
        surface: '#161616',
        surfaceAlt: '#1C1C1E',
        border: '#2A2A2C',
        borderStrong: '#3A3A3C',
        text: '#FFFFFF',
        textMuted: '#9A9A9E',
        eyebrow: '#8A8A8E',
        accent: '#2E8BFF',
        accentDim: '#1E5FB0',
        danger: '#FF453A',
      },
      borderRadius: {
        card: '22px',
        chip: '14px',
        pill: '999px',
        sheet: '28px',
      },
      fontFamily: {
        serif: ['SourceSerif4'],
        'serif-italic': ['SourceSerif4Italic'],
        sans: ['NunitoSans'],
        'sans-bold': ['NunitoSansBold'],
        'sans-extra': ['NunitoSansExtra'],
      },
    },
  },
  plugins: [],
};
