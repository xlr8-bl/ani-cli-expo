import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { EpisodeCard } from '@/components/ui/EpisodeCard';
import { FilterPill } from '@/components/ui/FilterPill';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors } from '@/theme/tokens';
import { useAnimeDetail } from '@/lib/anilist/hooks';
import { displayTitle } from '@/lib/anilist/types';
import { buildEpisodeList, episodeRanges, Episode } from '@/lib/episodes';
import { useEpisodeTitles, JikanEpisode } from '@/lib/jikan';
import { useAniZipEpisodes, AniZipEpisode } from '@/lib/anizip';
import { notYetDownloadable } from './index';

const RANGE_SIZE = 100;

/**
 * Full episode list — where shows past the Detail preview threshold land.
 * Very long shows (One Piece and friends) get range pills ("1–100", "101–200"…)
 * so the list stays navigable; releasing shows default to the latest range.
 */
export default function EpisodeListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const detail = useAnimeDetail(Number(id));

  const media = detail.data;
  const episodes = useMemo(() => (media ? buildEpisodeList(media) : []), [media]);
  const ranges = useMemo(
    () => (episodes.length > RANGE_SIZE ? episodeRanges(episodes.length, RANGE_SIZE) : []),
    [episodes.length],
  );

  // Releasing shows open on the latest range — that's where the new episode is.
  const [rangeIndex, setRangeIndex] = useState<number | null>(null);
  const activeRange =
    ranges.length === 0
      ? null
      : (rangeIndex ?? (media?.status === 'RELEASING' ? ranges.length - 1 : 0));

  const visible = useMemo(() => {
    if (activeRange === null || ranges.length === 0) return episodes;
    const r = ranges[activeRange];
    return episodes.slice(r.start - 1, r.end);
  }, [episodes, ranges, activeRange]);

  // Jikan pages are 100 episodes — exactly one range pill per page.
  const jikanPage = activeRange === null ? 1 : activeRange + 1;
  const episodeNames = useEpisodeTitles(media?.idMal, jikanPage);
  // ani.zip covers the whole show in one shot — fills names AND stills that
  // the other sources miss.
  const aniZip = useAniZipEpisodes(media?.id);

  const playEpisode = (n: number) =>
    router.push({ pathname: '/anime/[id]/watch', params: { id: String(id), ep: String(n) } });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Compact static header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="heading" numberOfLines={1}>
            Episodes
          </Text>
          {media && (
            <Text variant="meta" numberOfLines={1}>
              {displayTitle(media.title)} · {episodes.length} episodes
            </Text>
          )}
        </View>
      </View>

      {/* Range pills for very long shows */}
      {ranges.length > 1 && (
        <View style={styles.pillsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {ranges.map((r, i) => (
              <FilterPill
                key={r.label}
                label={r.label}
                active={i === activeRange}
                onPress={() => setRangeIndex(i)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {detail.isPending ? (
        <View style={{ paddingTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(ep) => String(ep.number)}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={7}
          renderItem={({ item }) => (
            <EpisodeRow
              episode={item}
              jikan={episodeNames.data?.get(item.number)}
              zip={aniZip.data?.get(item.number)}
              duration={media?.duration}
              fallbackImage={media?.coverImage.large ?? undefined}
              placeholderColor={media?.coverImage.color ?? colors.surfaceAlt}
              onPlay={() => playEpisode(item.number)}
            />
          )}
        />
      )}
    </View>
  );
}

function EpisodeRow({
  episode,
  jikan,
  zip,
  duration,
  fallbackImage,
  placeholderColor,
  onPlay,
}: {
  episode: Episode;
  jikan?: JikanEpisode;
  zip?: AniZipEpisode;
  duration?: number | null;
  fallbackImage?: string;
  placeholderColor: string;
  onPlay?: () => void;
}) {
  return (
    <EpisodeCard
      number={episode.number}
      title={episode.title ?? jikan?.title ?? zip?.title}
      image={episode.thumbnail ?? zip?.image ?? fallbackImage}
      placeholderColor={placeholderColor}
      duration={duration}
      airedAt={jikan?.aired ?? zip?.airDate}
      filler={jikan?.filler}
      recap={jikan?.recap}
      isNew={episode.isNew}
      onPress={onPlay}
      onDownload={notYetDownloadable}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pillsWrap: {
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
});