import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { EpisodeCard } from '@/components/ui/EpisodeCard';
import { PlayerControls } from '@/components/player/PlayerControls';
import { colors } from '@/theme/tokens';
import { useAnimeDetail } from '@/lib/anilist/hooks';
import { useEpisodeTitles } from '@/lib/jikan';
import { useAniZipEpisodes } from '@/lib/anizip';
import { useAllAnimeEpisodes, useAllAnimeShow } from '@/lib/allanime/hooks';
import { useEpisodeSources } from '@/lib/sources';
import { buildEpisodeList } from '@/lib/episodes';
import type { TranslationType, ResolvedSource } from '@/lib/allanime/types';

/**
 * Custom player screen. Tapping an episode lands here: it auto-resolves the
 * best source and starts playing, with fully custom glass controls (play/pause,
 * scrub, ±10s, quality, sub/dub, subtitles when available, fullscreen), and the
 * rest of the episodes listed below to switch between.
 */
export default function Watch() {
  const { id, ep } = useLocalSearchParams<{ id: string; ep: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<VideoView>(null);

  const detail = useAnimeDetail(Number(id));
  const media = detail.data;

  const episodes = useMemo(() => (media ? buildEpisodeList(media) : []), [media]);
  const episodeNames = useEpisodeTitles(media?.idMal, 1);
  const aniZip = useAniZipEpisodes(media?.id);

  const [episodeNumber, setEpisodeNumber] = useState(Number(ep) || 1);
  const [translation, setTranslation] = useState<'sub' | 'dub'>('sub');
  const [qualityIndex, setQualityIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<null | 'quality' | 'subtitles'>(null);

  // Dub availability hint.
  const show = useAllAnimeShow(Number(id), media?.title, translation, episodes.length);
  const allEpisodes = useAllAnimeEpisodes(show.data?.id ?? null);
  const hasDub = (allEpisodes.data?.dub.length ?? 0) > 0;

  const sources = useEpisodeSources(
    media
      ? {
          anilistId: Number(id),
          title: media.title,
          episodeNumber,
          totalEpisodes: episodes.length || media.episodes,
          translation,
        }
      : null,
    true,
  );
  const resolved = sources.data?.sources ?? [];
  const selected: ResolvedSource | undefined = resolved[qualityIndex] ?? resolved[0];

  // Reset quality to best whenever the source set changes.
  useEffect(() => {
    setQualityIndex(0);
  }, [sources.data]);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.5;
  });

  // Load the selected source into the player.
  useEffect(() => {
    if (!selected) return;
    player.replaceAsync({
      uri: selected.url,
      headers: selected.headers,
      contentType: selected.isM3u8 ? 'hls' : 'progressive',
    }).then(() => player.play()).catch(() => {});
  }, [selected?.url, player]);

  // Player state.
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEventListener(player, 'timeUpdate', (e) => {
    setCurrentTime(e.currentTime);
    if (player.duration > 0) setDuration(player.duration);
  });
  useEventListener(player, 'playingChange', (e) => setPlaying(e.isPlaying));
  useEventListener(player, 'statusChange', (e) => {
    setBuffering(e.status === 'loading');
    setFailed(e.status === 'error');
    if (e.status === 'readyToPlay') {
      const tracks = player.availableSubtitleTracks;
      if (tracks?.length && !player.subtitleTrack) player.subtitleTrack = tracks[0];
    }
  });

  // Auto-hide controls after a few seconds of playback.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);
  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls, selected?.url]);

  const currentEp = episodes.find((e) => e.number === episodeNumber);
  const epTitle =
    currentEp?.title ??
    episodeNames.data?.get(episodeNumber)?.title ??
    aniZip.data?.get(episodeNumber)?.title ??
    `Episode ${episodeNumber}`;
  const showTitle = media
    ? (media.title.english ?? media.title.romaji ?? 'XLR8')
    : 'XLR8';

  const subtitles = selected?.subtitles ?? [];

  const playEpisode = (n: number) => {
    if (n === episodeNumber) return;
    setEpisodeNumber(n);
    setCurrentTime(0);
    setDuration(0);
    setBuffering(true);
    setFailed(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* Video + controls */}
      <View style={[styles.videoWrap, { marginTop: insets.top }]}>
        <VideoView
          ref={videoRef}
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="contain"
          nativeControls={false}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={showControls}>
          {failed ? (
            <View style={styles.centered}>
              <Ionicons name="warning-outline" size={30} color="#FFF" />
              <Text variant="label" color="#FFF" style={{ marginTop: 8 }}>
                Playback failed
              </Text>
              {resolved.length > 1 && (
                <Pressable
                  onPress={() => {
                    setFailed(false);
                    setQualityIndex((i) => (i + 1) % resolved.length);
                  }}
                  style={styles.retryBtn}
                >
                  <Text variant="button" color={colors.accent}>
                    Try another source
                  </Text>
                </Pressable>
              )}
            </View>
          ) : sources.isFetching && resolved.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text variant="meta" color="#FFF" style={{ marginTop: 10 }}>
                Finding sources…
              </Text>
            </View>
          ) : resolved.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="cloud-offline-outline" size={30} color="#FFF" />
              <Text variant="label" color="#FFF" style={{ marginTop: 8 }}>
                No sources found
              </Text>
              <Pressable onPress={() => sources.refetch()} style={styles.retryBtn}>
                <Text variant="button" color={colors.accent}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : (
            <PlayerControls
              visible={controlsVisible}
              playing={playing}
              buffering={buffering}
              currentTime={currentTime}
              duration={duration}
              title={showTitle}
              subtitle={`Episode ${episodeNumber} · ${epTitle}`}
              qualityLabel={selected?.qualityLabel ?? 'auto'}
              translation={translation}
              hasDub={hasDub}
              onPlayPause={() => {
                playing ? player.pause() : player.play();
                showControls();
              }}
              onSeek={(t) => {
                player.currentTime = t;
                showControls();
              }}
              onSeekBy={(d) => {
                player.currentTime = Math.max(0, Math.min(duration || 1e9, player.currentTime + d));
                showControls();
              }}
              onBack={() => router.back()}
              onQuality={() => setMenu('quality')}
              onToggleTranslation={() => setTranslation((t) => (t === 'sub' ? 'dub' : 'sub'))}
              onFullscreen={() => videoRef.current?.enterFullscreen()}
            />
          )}
        </Pressable>
      </View>

      {/* Episodes below the player */}
      <FlatList
        data={episodes}
        keyExtractor={(e) => String(e.number)}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 20 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text variant="heading">Episodes</Text>
            {subtitles.length > 0 && (
              <View style={styles.subBadge}>
                <Ionicons name="text" size={12} color={colors.text} />
                <Text variant="eyebrow" color={colors.text} style={{ marginLeft: 4 }}>
                  Subtitles
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const jikan = episodeNames.data?.get(item.number);
          const zip = aniZip.data?.get(item.number);
          return (
            <View style={item.number === episodeNumber ? styles.activeEp : undefined}>
              <EpisodeCard
                number={item.number}
                title={item.title ?? jikan?.title ?? zip?.title}
                image={item.thumbnail ?? zip?.image ?? media?.coverImage.large}
                placeholderColor={media?.coverImage.color ?? colors.surfaceAlt}
                duration={media?.duration}
                airedAt={jikan?.aired ?? zip?.airDate}
                filler={jikan?.filler}
                recap={jikan?.recap}
                isNew={item.number === episodeNumber}
                onPress={() => playEpisode(item.number)}
              />
            </View>
          );
        }}
      />

      {/* Quality menu */}
      {menu === 'quality' && (
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <View style={[styles.menu, { paddingBottom: insets.bottom + 16 }]}>
            <Text variant="heading" style={styles.menuTitle}>
              Quality
            </Text>
            {resolved.map((s, i) => (
              <Pressable
                key={`${s.url}-${i}`}
                style={styles.menuRow}
                onPress={() => {
                  setQualityIndex(i);
                  setMenu(null);
                }}
              >
                <Text variant="label" color={i === qualityIndex ? colors.accent : colors.text}>
                  {s.qualityLabel} · {s.provider}
                </Text>
                {i === qualityIndex && (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    marginTop: 4,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeEp: {
    backgroundColor: 'rgba(46,139,255,0.08)',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  menuTitle: { marginBottom: 12 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
