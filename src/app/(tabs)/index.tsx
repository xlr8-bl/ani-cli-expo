import { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollBlendScreen } from '@/components/header/ScrollBlendHeader';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { Text } from '@/components/ui/Text';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ContentCard } from '@/components/ui/ContentCard';
import { PosterCard } from '@/components/ui/PosterCard';
import { Skeleton, SkeletonRail, SkeletonCard } from '@/components/ui/Skeleton';
import { colors } from '@/theme/tokens';
import {
  useTrending,
  usePopularThisSeason,
  useTopRated,
  useJustAired,
} from '@/lib/anilist/hooks';
import { displayTitle } from '@/lib/anilist/types';
import type { Media } from '@/lib/anilist/types';

const HERO_HEIGHT = 440;

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const trending = useTrending();
  const seasonal = usePopularThisSeason();
  const topRated = useTopRated();
  const justAired = useJustAired();

  const openDetail = useCallback(
    (m: Media) => router.push({ pathname: '/anime/[id]', params: { id: String(m.id) } }),
    [router],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['anilist'] });
    setRefreshing(false);
  }, [queryClient]);

  const heroItems = (trending.data ?? []).filter((m) => m.bannerImage).slice(0, 6);

  return (
    <ScrollBlendScreen
      title="Home"
      brand={<BrandLockup />}
      heroHeight={HERO_HEIGHT}
      headerRight={<SearchButton />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.text}
          progressViewOffset={90}
        />
      }
      hero={
        trending.isPending ? (
          <HeroSkeleton />
        ) : (
          <HeroCarousel items={heroItems} height={HERO_HEIGHT} onPressItem={openDetail} />
        )
      }
    >
      {/* New Releases — aired in the last 7 days */}
      <SectionHeader title="New Releases" onSeeAll={() => {}} />
      {justAired.isPending ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : justAired.isError ? (
        <SectionError onRetry={() => justAired.refetch()} />
      ) : (
        justAired.data.slice(0, 4).map((item) => (
          <ContentCard
            key={item.media.id}
            badge="New"
            title={displayTitle(item.media.title)}
            meta={`Episode ${item.episode} · ${timeAgo(item.airingAt)}`}
            image={item.media.coverImage.large ?? undefined}
            placeholderColor={item.media.coverImage.color ?? colors.surfaceAlt}
            onPress={() => openDetail(item.media)}
          />
        ))
      )}

      {/* Trending */}
      <SectionHeader title="Trending" onSeeAll={() => {}} />
      <MediaRail query={trending} onPressItem={openDetail} />

      {/* Popular This Season */}
      <SectionHeader title="Popular This Season" onSeeAll={() => {}} />
      <MediaRail query={seasonal} onPressItem={openDetail} />

      {/* Top Rated */}
      <SectionHeader title="Top Rated" onSeeAll={() => {}} />
      <MediaRail query={topRated} onPressItem={openDetail} showRank />
    </ScrollBlendScreen>
  );
}

/** Horizontal poster rail bound to one of the discovery queries. */
function MediaRail({
  query,
  onPressItem,
  showRank,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    data?: Media[];
    refetch: () => void;
  };
  onPressItem: (m: Media) => void;
  showRank?: boolean;
}) {
  if (query.isPending) return <SkeletonRail />;
  if (query.isError || !query.data) return <SectionError onRetry={() => query.refetch()} />;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {query.data.slice(0, 15).map((m, i) => (
        <PosterCard
          key={m.id}
          title={showRank ? `${i + 1}. ${displayTitle(m.title)}` : displayTitle(m.title)}
          image={m.coverImage.extraLarge ?? m.coverImage.large}
          color={m.coverImage.color}
          score={m.averageScore}
          onPress={() => onPressItem(m)}
        />
      ))}
    </ScrollView>
  );
}

/** Compact inline retry row — scraping/network breakage never dead-ends. */
function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <Pressable onPress={onRetry} style={styles.error}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.textMuted} />
      <Text variant="meta" style={{ flex: 1 }}>
        Couldn&apos;t load this row.
      </Text>
      <Text variant="button" color={colors.accent}>
        Retry
      </Text>
    </Pressable>
  );
}

function HeroSkeleton() {
  return (
    <View style={styles.heroSkeleton}>
      <Skeleton style={{ width: 90, height: 22, borderRadius: 8 }} />
      <Skeleton style={{ width: '85%', height: 34, borderRadius: 10, marginTop: 14 }} />
      <Skeleton style={{ width: '55%', height: 34, borderRadius: 10, marginTop: 8 }} />
      <Skeleton style={{ width: 160, height: 13, borderRadius: 7, marginTop: 14 }} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
        <Skeleton style={{ width: 110, height: 42, borderRadius: 999 }} />
        <Skeleton style={{ width: 110, height: 42, borderRadius: 14 }} />
      </View>
    </View>
  );
}

/**
 * Typographic XLR8 wordmark; ghosts out on scroll as the compact screen title
 * takes its slot. Placeholder for the hand-drawn manga lockup.
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
  const router = useRouter();
  return (
    <Pressable style={styles.searchBtn} hitSlop={8} onPress={() => router.push('/search')}>
      <Ionicons name="search" size={20} color={colors.text} />
    </Pressable>
  );
}

function timeAgo(unixSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  const hours = Math.floor(diff / 3600);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  heroSkeleton: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    backgroundColor: 'rgba(22,22,22,0.7)',
  },
});
