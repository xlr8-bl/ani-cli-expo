import { Tabs } from 'expo-router/js-tabs';
import { GlassTabBar } from '@/components/nav/GlassTabBar';
import { colors } from '@/theme/tokens';

/**
 * Tab shell. The default tab bar is fully replaced by the floating glass
 * capsule (GlassTabBar). Order here defines the nav order:
 * Home · Search · Library · Downloads · Settings.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="downloads" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
