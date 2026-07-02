import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScrollBlendScreen } from '@/components/header/ScrollBlendHeader';
import { Text } from '@/components/ui/Text';
import { GenreChip } from '@/components/ui/GenreChip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme/tokens';
import { useAnimeDetail } from '@/lib/anilist/hooks';
import { displayTitle, plainDescription } from '@/lib/anilist/types';

const HERO_HEIGHT = 420;

/**
 * Detail screen — Milestone 2 ships the hero + synopsis + genres skeleton of
 * it; season selector, episode grid, cast and Related land in Milestone 3.
 */
export default function AnimeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useAnimeDetail(Number(id));

  const title = detail.data ? displayTitle(detail.data.title) : ' ';

  return (
    <ScrollBlendScreen
      title={title}
      heroHeight={HERO_HEIGHT}
      headerRight={<BackButton onPress={() => router.back()} />}
      hero={
        detail.isPending ? (
          <View style={styles.heroSkeleton}>
            <Skeleton style={{ width: '75%', height: 34, borderRadius: 10 }} />
            <Skeleton style={{ width: 180, height: 14, borderRadius: 7, marginTop: 12 }} />
          </View>
        ) : detail.data ? (
          <Hero media={detail.data} />
        ) : (
          <View style={styles.heroSkeleton}>
            <Text variant="label" color={colors.textMuted}>
              Couldn&apos;t load this title.
            </Text>
            <Pressable onPress={() => detail.refetch()} style={{ marginTop: 10 }}>
              <Text variant="button" color={colors.accent}>
                Retry
              </Text>
            </Pressable>
          </View>
        )
      }
    >
      {detail.isPending ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Skeleton style={{ width: '100%', height: 16, borderRadius: 8 }} />
          <Skeleton style={{ width: '100%', height: 16, borderRadius: 8 }} />
          <Skeleton style={{ width: '70%', height: 16, borderRadius: 8 }} />
        </View>
      ) : detail.data ? (
        <>
          {/* Synopsis — the serif editorial moment */}
          <SectionHeader title="Synopsis" />
          <View style={styles.synopsisWrap}>
            <Text variant="serif">{plainDescription(detail.data.description)}</Text>
          </View>

          {/* Genres */}
          {detail.data.genres.length > 0 && (
            <>
              <SectionHeader title="Genres" />
              <View style={styles.chipGrid}>
                {detail.data.genres.map((g) => (
                  <View key={g} style={styles.chipCell}>
                    <GenreChip label={g} />
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Episodes land in Milestone 3 */}
          <SectionHeader title="Episodes" />
          <View style={styles.comingSoon}>
            <Ionicons name="film-outline" size={22} color={colors.borderStrong} />
            <Text variant="meta">Episode list & playback coming in the next milestone</Text>
          </View>
        </>
      ) : null}
    </ScrollBlendScreen>
  );
}

function Hero({ media }: { media: NonNullable<ReturnType<typeof useAnimeDetail>['data']> }) {
  const art = media.bannerImage ?? media.coverImage.extraLarge ?? media.coverImage.large;
  const meta = [
    media.format,
    media.season && media.seasonYear ? `${media.season} ${media.seasonYear}` : null,
    media.episodes ? `${media.episodes} eps` : null,
    media.status,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={art ?? undefined}
        style={[StyleSheet.absoluteFill, { backgroundColor: media.coverImage.color ?? '#101018' }]}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', '#000000']}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <View style={styles.heroRow}>
          <Image
            source={media.coverImage.large ?? undefined}
            style={[styles.cover, { backgroundColor: media.coverImage.color ?? colors.surfaceAlt }]}
            contentFit="cover"
            transition={300}
          />
          <View style={{ flex: 1 }}>
            {typeof media.averageScore === 'number' && media.averageScore > 0 && (
              <View style={styles.scoreChip}>
                <Ionicons name="star" size={12} color="#FFD54A" />
                <Text variant="eyebrow" color={colors.text} style={{ marginLeft: 4 }}>
                  {(media.averageScore / 10).toFixed(1)}
                </Text>
              </View>
            )}
            <Text variant="title" numberOfLines={3} style={styles.heroTitle}>
              {displayTitle(media.title)}
            </Text>
            {meta ? (
              <Text variant="meta" style={{ marginTop: 6 }}>
                {meta}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBtn} hitSlop={8} onPress={onPress}>
      <Ionicons name="chevron-down" size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroSkeleton: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  cover: {
    width: 104,
    height: 156,
    borderRadius: 16,
  },
  scoreChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 31,
  },
  synopsisWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chipCell: {
    width: '50%',
    padding: 6,
  },
  comingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,22,22,0.7)',
  },
});
