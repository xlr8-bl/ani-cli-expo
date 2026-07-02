import { useState } from 'react';
import { View, Modal, Pressable, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { FilterPill } from '@/components/ui/FilterPill';
import { colors, radius } from '@/theme/tokens';
import { useAllAnimeShow, useAllAnimeEpisodes, useEpisodeSources } from '@/lib/allanime/hooks';
import type { MediaTitle } from '@/lib/anilist/types';
import type { TranslationType, ResolvedSource } from '@/lib/allanime/types';
import { usePlayer } from '@/store/player';

/**
 * Bottom-sheet source picker. On open it matches the show on AllAnime,
 * resolves the tapped episode's streams (de-obfuscating each provider), and
 * lists the available qualities with a sub/dub switch. Selecting one hands off
 * to the player. Low-confidence matches and scraping failures surface retry /
 * manual paths rather than dead-ending.
 */
export function SourceSheet({
  visible,
  onClose,
  anilistId,
  title,
  episodeNumber,
}: {
  visible: boolean;
  onClose: () => void;
  anilistId: number;
  title: MediaTitle;
  episodeNumber: number | null;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setNow = usePlayer((s) => s.setNow);
  const [translation, setTranslation] = useState<TranslationType>('sub');

  const show = useAllAnimeShow(anilistId, title, translation);
  const showId = show.data?.id ?? null;
  const episodes = useAllAnimeEpisodes(showId);

  // AllAnime episode identifiers are strings; match ours by number.
  const episodeString =
    episodeNumber != null
      ? (episodes.data?.[translation].find((e) => Number(e) === episodeNumber) ?? String(episodeNumber))
      : null;

  const sources = useEpisodeSources(showId, episodeString, translation, visible && Boolean(showId));

  const dubCount = episodes.data?.dub.length ?? 0;
  const hasDub = dubCount > 0;

  const pickSource = (source: ResolvedSource) => {
    if (episodeNumber == null) return;
    setNow({
      source,
      title: `Episode ${episodeNumber}`,
      episodeNumber,
      alternates: sources.data ?? [],
    });
    onClose();
    router.push('/watch');
  };

  const resolving = show.isPending || episodes.isPending || sources.isFetching;
  const noMatch = show.data && show.data.id === null;
  const noSources = sources.isError || (sources.data && sources.data.length === 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text variant="heading">Episode {episodeNumber}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Sub / Dub toggle */}
        <View style={styles.pillRow}>
          <FilterPill label="Sub" active={translation === 'sub'} onPress={() => setTranslation('sub')} />
          {hasDub && (
            <FilterPill label="Dub" active={translation === 'dub'} onPress={() => setTranslation('dub')} />
          )}
        </View>

        {resolving ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.accent} />
            <Text variant="meta" style={{ marginTop: 12 }}>
              Finding sources…
            </Text>
          </View>
        ) : noMatch ? (
          <View style={styles.state}>
            <Ionicons name="link-outline" size={30} color={colors.borderStrong} />
            <Text variant="label" color={colors.textMuted} style={{ marginTop: 10 }}>
              Couldn&apos;t match this show
            </Text>
            <Text variant="meta" style={{ marginTop: 4, textAlign: 'center' }}>
              Manual source linking is coming soon.
            </Text>
          </View>
        ) : noSources ? (
          <View style={styles.state}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.borderStrong} />
            <Text variant="label" color={colors.textMuted} style={{ marginTop: 10 }}>
              No sources found
            </Text>
            <TouchableOpacity
              onPress={() => sources.refetch()}
              activeOpacity={0.8}
              style={styles.retryBtn}
            >
              <Text variant="button" color={colors.accent}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {(sources.data ?? []).map((s, i) => (
              <TouchableOpacity
                key={`${s.url}-${i}`}
                onPress={() => pickSource(s)}
                activeOpacity={0.8}
                style={styles.sourceRow}
              >
                <View style={styles.qualityBadge}>
                  <Text variant="button" color={colors.text}>
                    {s.qualityLabel}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={1}>
                    {s.provider}
                  </Text>
                  <Text variant="meta">{s.isM3u8 ? 'HLS stream' : 'MP4'}</Text>
                </View>
                <Ionicons name="play-circle" size={26} color={colors.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  list: {
    paddingVertical: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  qualityBadge: {
    minWidth: 58,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
