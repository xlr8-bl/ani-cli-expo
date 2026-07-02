import { View, Pressable, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Text } from '@/components/ui/Text';
import { colors, glass, radius } from '@/theme/tokens';

/**
 * The signature floating glass bottom nav.
 *
 * A frosted-glass capsule inset from the screen edges (not an edge-to-edge
 * bar). Content scrolling underneath is visibly blurred *through* the bar via a
 * real backdrop blur (expo-blur; on Android we opt into dimezisBlurView so the
 * blur is real, not a flat tint). The active tab gets its own smaller lighter
 * pill highlight behind icon+label and its icon switches from outlined to
 * filled. A soft drop shadow makes the whole capsule float above the content.
 */

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'home', off: 'home-outline' },
  search: { on: 'search', off: 'search-outline' },
  library: { on: 'library', off: 'library-outline' },
  downloads: { on: 'download', off: 'download-outline' },
  settings: { on: 'settings', off: 'settings-outline' },
};

const LABELS: Record<string, string> = {
  index: 'Home',
  search: 'Search',
  library: 'Library',
  downloads: 'Downloads',
  settings: 'Settings',
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.shadow}>
        <BlurView
          intensity={glass.navIntensity}
          tint={glass.tint}
          experimentalBlurMethod="dimezisBlurView"
          style={styles.bar}
        >
          {/* subtle inner fill + hairline so the glass reads on pure-black too */}
          <View style={styles.innerTint} pointerEvents="none" />
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icon = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' };
            const label = LABELS[route.name] ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
              >
                <View style={[styles.tabInner, focused && styles.tabInnerActive]}>
                  <Ionicons
                    name={focused ? icon.on : icon.off}
                    size={22}
                    color={focused ? colors.text : colors.textMuted}
                  />
                  <Text
                    variant="eyebrow"
                    color={focused ? colors.text : colors.textMuted}
                    style={styles.label}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  shadow: {
    borderRadius: radius.pill,
    // soft drop shadow so the capsule visibly floats
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  innerTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,20,20,0.35)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    width: '100%',
  },
  tabInnerActive: {
    // lighter semi-opaque capsule floating inside the glass bar
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.2,
  },
});
