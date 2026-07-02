import { ReactNode, ReactElement } from 'react';
import { View, StyleSheet, useWindowDimensions, RefreshControlProps } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { colors, glass } from '@/theme/tokens';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// How far the compact header's backdrop bleeds below the bar before fully
// dissolving — there is never a clean edge cutting the content.
const FADE = 36;

/**
 * The scroll-blend header — the second signature element.
 *
 * The top region starts as a large full-bleed hero with the brand lockup
 * (app name) overlaid at the top. As the user scrolls, the hero collapses
 * into a compact sticky header — not as a hard cut: the brand/hero ghost out
 * (opacity + translate) while the compact screen title solidifies in the same
 * slot, and the header's blurred backdrop fades in as a soft top-down
 * GRADIENT that dissolves over an extra bleed zone below the bar, so there is
 * no clean border between header and content.
 *
 * Driven entirely by a scroll-linked interpolation (Reanimated), not a
 * show/hide toggle. Reused by Home and Detail.
 */
export function ScrollBlendScreen({
  title,
  brand,
  hero,
  heroHeight = 380,
  headerRight,
  refreshControl,
  children,
}: {
  /** Compact sticky title that solidifies on scroll. */
  title: string;
  /** Brand lockup (app name) shown at the top while expanded; ghosts out on scroll. */
  brand?: ReactNode;
  /** Full-bleed hero content rendered at the top of the scroll. */
  hero: ReactNode;
  heroHeight?: number;
  headerRight?: ReactNode;
  /** Optional RefreshControl element for pull-to-refresh. */
  refreshControl?: ReactElement<RefreshControlProps>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const barH = insets.top + 52;
  // The hero has fully collapsed once we've scrolled ~60% of its height.
  const collapseEnd = heroHeight - barH;
  const blendStart = collapseEnd * 0.45;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Compact backdrop: blur intensity + gradient tint fade in together.
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
    opacity: interpolate(scrollY.value, [blendStart, collapseEnd], [0, 1], Extrapolation.CLAMP),
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

  // Brand lockup: visible while expanded, ghosts out as the title arrives.
  const brandStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, blendStart], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, blendStart], [0, -8], Extrapolation.CLAMP),
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
        translateY: interpolate(scrollY.value, [0, collapseEnd], [0, -40], Extrapolation.CLAMP),
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
        refreshControl={refreshControl}
      >
        <Animated.View style={[{ height: heroHeight, width }, heroStyle]}>{hero}</Animated.View>
        <View style={styles.body}>{children}</View>
      </Animated.ScrollView>

      {/* Sticky compact header overlay. Extends FADE px past the bar so the
          backdrop dissolves in a gradient instead of a hard edge. */}
      <View
        style={[styles.compact, { height: barH + FADE, paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        {/* Blur bleeds slightly into the fade zone; its lower edge sits where
            the gradient is still dark, so no visible seam. */}
        <AnimatedBlurView
          animatedProps={blurAnimatedProps}
          tint={glass.tint}
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, { bottom: FADE - 14 }]}
          pointerEvents="none"
        />
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0)']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.row}>
          <View style={styles.titleSlot}>
            {brand ? (
              <Animated.View style={[styles.slotFill, brandStyle]}>{brand}</Animated.View>
            ) : null}
            <Animated.View style={[styles.slotFill, compactTitleStyle]}>
              <Text variant="heading" numberOfLines={1}>
                {title}
              </Text>
            </Animated.View>
          </View>
          {headerRight ? <View style={styles.right}>{headerRight}</View> : null}
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
  },
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleSlot: {
    flex: 1,
    height: '100%',
  },
  slotFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  right: {
    marginLeft: 12,
  },
});
