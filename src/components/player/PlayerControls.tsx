import { useRef } from 'react';
import { View, Pressable, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

/** Custom glass player controls overlay. */
export function PlayerControls({
  visible,
  playing,
  buffering,
  currentTime,
  duration,
  title,
  subtitle,
  qualityLabel,
  translation,
  hasDub,
  onPlayPause,
  onSeek,
  onSeekBy,
  onBack,
  onQuality,
  onToggleTranslation,
  onFullscreen,
}: {
  visible: boolean;
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  title: string;
  subtitle: string;
  qualityLabel: string;
  translation: 'sub' | 'dub';
  hasDub: boolean;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSeekBy: (delta: number) => void;
  onBack: () => void;
  onQuality: () => void;
  onToggleTranslation: () => void;
  onFullscreen: () => void;
}) {
  const barWidth = useRef(0);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => seekToX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => seekToX(e.nativeEvent.locationX),
    }),
  ).current;

  function seekToX(x: number) {
    if (barWidth.current <= 0 || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / barWidth.current));
    onSeek(ratio * duration);
  }

  const onBarLayout = (e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  };

  if (!visible) {
    return buffering ? (
      <View style={styles.centerOnly} pointerEvents="none">
        <Spinner />
      </View>
    ) : null;
  }

  return (
    <View style={styles.overlay}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text variant="label" color="#FFF" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="meta" color="rgba(255,255,255,0.7)" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {hasDub && (
          <Pressable onPress={onToggleTranslation} hitSlop={8} style={styles.pillBtn}>
            <Text variant="button" color="#FFF">
              {translation === 'sub' ? 'Sub' : 'Dub'}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={onQuality} hitSlop={8} style={styles.pillBtn}>
          <Ionicons name="settings-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
          <Text variant="button" color="#FFF">
            {qualityLabel}
          </Text>
        </Pressable>
      </View>

      {/* Center transport */}
      <View style={styles.center}>
        <Pressable onPress={() => onSeekBy(-10)} hitSlop={10} style={styles.seekBtn}>
          <Ionicons name="play-back" size={26} color="#FFF" />
          <Text variant="eyebrow" color="#FFF" style={styles.seekLabel}>
            10
          </Text>
        </Pressable>
        <Pressable onPress={onPlayPause} style={styles.playBtn}>
          {buffering ? (
            <Spinner />
          ) : (
            <Ionicons name={playing ? 'pause' : 'play'} size={34} color="#FFF" />
          )}
        </Pressable>
        <Pressable onPress={() => onSeekBy(10)} hitSlop={10} style={styles.seekBtn}>
          <Ionicons name="play-forward" size={26} color="#FFF" />
          <Text variant="eyebrow" color="#FFF" style={styles.seekLabel}>
            10
          </Text>
        </Pressable>
      </View>

      {/* Bottom scrubber */}
      <View style={styles.bottomBar}>
        <Text variant="meta" color="#FFF" style={styles.time}>
          {fmt(currentTime)}
        </Text>
        <View style={styles.barTouch} onLayout={onBarLayout} {...pan.panHandlers}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.barKnob, { left: `${progress * 100}%` }]} />
          </View>
        </View>
        <Text variant="meta" color="#FFF" style={styles.time}>
          {fmt(duration)}
        </Text>
        <Pressable onPress={onFullscreen} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="scan-outline" size={20} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

function Spinner() {
  return (
    <View style={styles.spinner}>
      <Ionicons name="sync" size={30} color="#FFF" />
    </View>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
  },
  centerOnly: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  titleWrap: { flex: 1 },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 42,
  },
  seekBtn: { alignItems: 'center', justifyContent: 'center' },
  seekLabel: { fontSize: 9, marginTop: -2 },
  playBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  time: { fontSize: 12, color: '#FFF', minWidth: 42, textAlign: 'center' },
  barTouch: { flex: 1, height: 28, justifyContent: 'center' },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  barKnob: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: '#FFF',
  },
  spinner: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
