import { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { colors, glass } from '@/theme/tokens';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * The scroll-blend header — the second signature element.
 *
 * The top region starts as a large full-bleed hero with text overlaid directly
 * on it (no card border, no bar chrome, bleeds to the edges). As the user
 * scrolls, the hero COLLAPSES into a compact sticky header — but not as a hard
 * cut: the outgoing hero fades and ghosts behind the incoming compact title via
 * an opacity/translateY blend, so for a moment both are partially visible, one
 * dissolving as the other solidifies. The sticky header itself picks up a real
 * translucent blurred backdrop (same glass family as the bottom nav), its blur
 * intensity interpolated from 0 → full rather than snapping on.
 *
 * Driven entirely by a scroll-linked interpolation (Reanimated), not a
 * show/hide toggle. Reused by Home and Detail.
 */
export function ScrollBlendScreen({
  title,
  hero,
  heroHeight = 380,
  headerRight,
  children,
  onScrollOffsetChange,
}: {
  /** Compact sticky title (rounded sans). */
  title: string;
  /** Full-bleed hero content rendered at the top of the scroll. */
  hero: ReactNode;
  heroHeight?: number;
  headerRight?: ReactNode;
  children: ReactNode;
  onScrollOffsetChange?: (y: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const compactHeaderH = insets.top + 52;
  // The hero has fully collapsed once we've scrolled ~60% of its height.
  const collapseEnd = heroHeight - compactHeaderH;
  const blendStart = collapseEnd * 0.45;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Compact header backdrop: blur intensity + tint fade in together.
  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(
      scrollY.value,
      [blendStart, collapseEnd],
      [0, glass.headerIntensity],
      Extrapolation.CLAMP,
    ),
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [blendStart, collapseEnd], [0, 1], Extrapolation.CLAMP),
  }));

  // Compact title: fades in + slides up into place as the hero dissolves.
  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [blendStart, collapseEnd],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [blendStart, collapseEnd],
          [10, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Hero content: parallax + ghost-out. It keeps a little residual opacity past
  // the blend point so it "ghosts" behind the compact header for a beat.
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, blendStart, collapseEnd],
      [1, 0.65, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, collapseEnd],
          [0, -40],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <Animated.View style={[{ height: heroHeight, width }, heroStyle]}>{hero}</Animated.View>
        <View style={styles.body}>{children}</View>
      </Animated.ScrollView>

      {/* Sticky compact header overlay */}
      <View style={[styles.compact, { height: compactHeaderH, paddingTop: insets.top }]}>
        <AnimatedBlurView
          animatedProps={blurAnimatedProps}
          tint={glass.tint}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.compactTintFill, backdropStyle]} pointerEvents="none" />
        <View style={styles.compactRow}>
          <Animated.View style={[styles.compactTitleWrap, compactTitleStyle]}>
            <Text variant="heading" numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
          {headerRight ? <View style={styles.compactRight}>{headerRight}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    paddingTop: 20,
  },
  compact: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  compactTintFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  compactRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  compactTitleWrap: {
    flex: 1,
  },
  compactRight: {
    marginLeft: 12,
  },
});
