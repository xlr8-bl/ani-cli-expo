import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScrollBlendScreen } from '@/components/header/ScrollBlendHeader';
import { Text } from '@/components/ui/Text';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { GenreChip } from '@/components/ui/GenreChip';
import { FilterPill } from '@/components/ui/FilterPill';
import { ContentCard } from '@/components/ui/ContentCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { colors, genreColor, radius } from '@/theme/tokens';
import { useState } from 'react';

/**
 * XLR8 Design System showcase (Milestone 1).
 * Proves every signature element in one scroll before real screens are wired:
 * serif/sans pairing, true-black surfaces, colorful chips, filter pills,
 * thumbnail-right cards, section headers, the scroll-blend header, and the
 * floating glass bottom nav around it.
 */

const GENRES = [
  'Action',
  'Adventure',
  'Fantasy',
  'Comedy',
  'Drama',
  'Romance',
  'Sci-Fi',
  'Supernatural',
];

const FILTERS = ['Trending', 'Sub', 'Dub', 'Movies', 'Ongoing'];

export default function Showcase() {
  const [activeFilter, setActiveFilter] = useState(0);

  return (
    <ScrollBlendScreen
      title="Design System"
      brand={<BrandLockup />}
      heroHeight={400}
      headerRight={<SearchButton />}
      hero={<Hero />}
    >
      {/* Typography specimen */}
      <SectionHeader title="Typography" />
      <View style={styles.block}>
        <View style={styles.specimen}>
          <Eyebrow>Editorial serif · the hero moment</Eyebrow>
          <Text variant="serif" style={{ marginTop: 8 }}>
            A quiet elf mage outlives the party she once saved the world with, and
            sets out to understand the humans she never took the time to know.
          </Text>
          <View style={styles.divider} />
          <Eyebrow>SF Pro Display · all ui text</Eyebrow>
          <Text variant="title" style={{ marginTop: 8 }}>
            Frieren
          </Text>
          <Text variant="label" color={colors.textMuted}>
            headings · labels · buttons · nav
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <SectionHeader title="Filter Pills" />
      <View style={styles.pillRow}>
        {FILTERS.map((f, i) => (
          <FilterPill
            key={f}
            label={f}
            active={i === activeFilter}
            onPress={() => setActiveFilter(i)}
          />
        ))}
      </View>

      {/* Genre chip grid */}
      <SectionHeader title="Genres" onSeeAll={() => {}} />
      <View style={styles.chipGrid}>
        {GENRES.map((g) => (
          <View key={g} style={styles.chipCell}>
            <GenreChip label={g} />
          </View>
        ))}
      </View>

      {/* Continue Watching — thumbnail-right card w/ resume progress */}
      <SectionHeader title="Continue Watching" onSeeAll={() => {}} />
      <ContentCard
        eyebrow="Episode 12"
        title="Jujutsu Kaisen"
        meta="8 min left"
        progress={0.72}
        image="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg"
        placeholderColor="#3A2A4A"
      />

      {/* New Releases — NEW badge */}
      <SectionHeader title="New Releases" onSeeAll={() => {}} />
      <ContentCard
        badge="New"
        title="Solo Leveling"
        meta="Episode 1 · Sub · 1080p"
        image="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-vfhFC1a6155o.png"
        placeholderColor="#243B5A"
      />
      <ContentCard
        badge="New"
        title="Dandadan"
        meta="Episode 3 · Sub/Dub · 1080p"
        image="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx171018-2ATBpVNoUyfC.jpg"
        placeholderColor="#5A2438"
      />

      {/* Trending — plain thumbnail-right rows */}
      <SectionHeader title="Trending" onSeeAll={() => {}} />
      <ContentCard
        eyebrow="Trending #1"
        title="Chainsaw Man"
        meta="Action · Supernatural"
        image="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-FlochcFsyoF4.png"
        placeholderColor="#4A1F1F"
      />

      <View style={{ height: 8 }} />
    </ScrollBlendScreen>
  );
}

/**
 * Typographic XLR8 wordmark shown at the top of the expanded hero; ghosts out
 * on scroll as the compact screen title takes its slot. Placeholder for the
 * hand-drawn manga head + speech-bubble lockup coming in the branding pass.
 */
function BrandLockup() {
  return (
    <View style={styles.brandRow}>
      <Text variant="heading" style={styles.brandMark}>
        XLR8
      </Text>
      <View style={styles.brandDot} />
    </View>
  );
}

function SearchButton() {
  return (
    <Pressable style={styles.searchBtn} hitSlop={8}>
      <Ionicons name="search" size={20} color={colors.text} />
    </Pressable>
  );
}

function Hero() {
  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={['#1a2740', '#3a2140', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* bottom scrim so overlaid text stays legible + bleeds into the black */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <View style={styles.heroBadges}>
          <Badge label="Spotlight" />
          <View style={{ width: 8 }} />
          <View style={styles.scoreChip}>
            <Ionicons name="star" size={12} color="#FFD54A" />
            <Text variant="eyebrow" color={colors.text} style={{ marginLeft: 4 }}>
              9.1
            </Text>
          </View>
        </View>
        <Text variant="hero" style={styles.heroTitle}>
          Frieren: Beyond{'\n'}Journey&apos;s End
        </Text>
        <Text variant="meta" style={{ marginTop: 8 }}>
          Fantasy · Adventure · Fall 2023 · 28 eps
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.playBtn}>
            <Ionicons name="play" size={16} color={colors.textInverse} />
            <Text variant="button" color={colors.textInverse} style={{ marginLeft: 6 }}>
              Play E1
            </Text>
          </Pressable>
          <GenreChip label="Fantasy" color={genreColor('Fantasy')} style={styles.heroGenre} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  specimen: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chipCell: {
    width: '50%',
    padding: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  brandMark: {
    fontSize: 24,
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginLeft: 3,
    marginTop: 4,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // Hero
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroTitle: {
    fontSize: 40,
    lineHeight: 46,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  heroGenre: {
    paddingVertical: 11,
  },
});
