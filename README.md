# XLR8

A polished, native-feeling anime streaming + downloading app for a small
friend group, distributed as a sideloaded build (no app store). No accounts,
no telemetry, no server — **the device is the account**. Metadata comes from
AniList; video streams are resolved the way ani-cli / Aniyomi do. This repo is
the premium native UI layer on top of that.

> Personal / educational project. Not affiliated with any streaming service.

## Design language

XLR8 reads as a **true-black, glassy, editorial content app**:

- **Serif + rounded-sans pairing** — a warm literary serif (Source Serif 4) for
  expressive/long-form moments (synopsis, hero); a bold rounded sans
  (Nunito Sans) for all UI text, headings, labels and buttons.
- **True-black surfaces** — base `#000`, elevated cards `#161616–#1C1C1E`, soft
  ~22pt radii. Electric-blue accent used sparingly (active tab, key CTAs).
- **Colorful genre chips** — flat, saturated, solid-color fills, each genre a
  consistent assigned color, bold white caps labels.
- **Floating glass bottom nav** — a frosted `expo-blur` capsule inset from the
  edges, with an active-tab pill highlight and outline→filled icon swap.
- **Scroll-blend header** — a full-bleed hero that collapses into a compact,
  blurred sticky header as you scroll; the outgoing hero ghosts behind the
  incoming title via a Reanimated-driven opacity/translate blend.

## Status

**Milestone 1 — Design system + showcase.** The design system is built and
proven in isolation on a single scrollable showcase screen
(`src/app/(tabs)/index.tsx`) before any real content screen is wired. Home /
Search / Library / Downloads / Settings exist as nav stubs.

Roadmap (later milestones): AniList Home feeds → Detail → AllAnime scraper +
title matching → Player → per-show grouped Downloads → Search/Library/Settings
+ privacy + backup → easter eggs → EAS Build + release.

## Tech stack

Expo (managed, SDK 57) · Expo Router · TypeScript · NativeWind · `expo-blur` ·
`react-native-reanimated` + `react-native-gesture-handler` · `expo-image` ·
`@expo-google-fonts` (Source Serif 4 + Nunito Sans).

## Run it

```bash
npm install
npx expo start        # then press i / a, or scan with Expo Go
npx expo start --web  # quick layout/color preview in a browser
```

> Real backdrop blur is only fully visible on device/simulator. On web,
> `expo-blur` is approximate — use web for layout/color/typography checks and a
> device for the glass surfaces.

## Project layout

```
src/
  app/(tabs)/          # Expo Router tab routes (index = design-system showcase)
  components/ui/        # Text, GenreChip, FilterPill, ContentCard, SectionHeader…
  components/nav/        # GlassTabBar (floating frosted capsule)
  components/header/     # ScrollBlendHeader (collapsing hero → sticky blur)
  theme/tokens.ts        # single source of truth: colors, radii, fonts, genre colors
```
