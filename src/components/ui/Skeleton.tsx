import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme/tokens';

/**
 * Pulsing shimmer block — loading states are always skeletons that mirror the
 * real layout, never a bare spinner.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

/** Horizontal rail of poster-shaped skeletons. */
export function SkeletonRail() {
  return (
    <View style={styles.rail}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 8 }}>
          <Skeleton style={styles.poster} />
          <Skeleton style={styles.line} />
        </View>
      ))}
    </View>
  );
}

/** Widescreen episode-row skeleton (16:9 thumb left + text lines). */
export function SkeletonEpisode() {
  return (
    <View style={styles.episodeRow}>
      <Skeleton style={{ width: 148, height: 83, borderRadius: 14 }} />
      <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
        <Skeleton style={{ width: '85%', height: 15, borderRadius: 8 }} />
        <Skeleton style={{ width: 120, height: 12, borderRadius: 6 }} />
      </View>
    </View>
  );
}

/** Thumbnail-right card-shaped skeleton. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 10 }}>
        <Skeleton style={{ width: 90, height: 12, borderRadius: 6 }} />
        <Skeleton style={{ width: '80%', height: 16, borderRadius: 8 }} />
        <Skeleton style={{ width: 120, height: 12, borderRadius: 6 }} />
      </View>
      <Skeleton style={{ width: 96, height: 96, borderRadius: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceAlt,
  },
  rail: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  poster: {
    width: 128,
    height: 192,
    borderRadius: 18,
  },
  line: {
    width: 100,
    height: 12,
    borderRadius: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});
