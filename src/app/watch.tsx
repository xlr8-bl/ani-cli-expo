import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';
import { usePlayer } from '@/store/player';

/**
 * Minimal player (Milestone 4): plays the resolved AllAnime source with
 * native controls, the required CDN headers, and a back button. Fully custom
 * glass controls, gestures, PiP, quality switching and resume come in the
 * player milestone.
 */
export default function Watch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = usePlayer((s) => s.now);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const player = useVideoPlayer(
    now
      ? {
          uri: now.source.url,
          headers: now.source.headers,
          // Many sources (e.g. the fast4speed mp4) have no file extension and
          // serve octet-stream, so the player can't auto-detect the format.
          // Tell it explicitly: hls for m3u8, progressive for mp4.
          contentType: now.source.isM3u8 ? 'hls' : 'progressive',
        }
      : null,
    (p) => {
      p.play();
    },
  );

  useEventListener(player, 'statusChange', ({ status: s }) => {
    if (s === 'readyToPlay') setStatus('ready');
    else if (s === 'error') setStatus('error');
  });

  useEffect(() => {
    if (!now) router.back();
  }, [now, router]);

  if (!now) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        nativeControls
        allowsPictureInPicture
      />

      {status === 'loading' && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text variant="meta" color="#FFFFFF" style={{ marginTop: 12 }}>
            Loading {now.title.toLowerCase()}…
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.overlay}>
          <Ionicons name="warning-outline" size={34} color="#FFFFFF" />
          <Text variant="label" color="#FFFFFF" style={{ marginTop: 10 }}>
            Playback failed
          </Text>
          <Text variant="meta" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>
            Try a different source.
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        hitSlop={10}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
