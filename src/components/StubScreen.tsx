import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Placeholder screen for tabs not yet built in Milestone 1. Keeps the nav
 * functional and the theme consistent while the real screens land later.
 */
export function StubScreen({
  title,
  icon,
  note,
}: {
  title: string;
  icon: IconName;
  note: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      <View style={styles.center}>
        <Ionicons name={icon} size={44} color={colors.borderStrong} />
        <Text variant="label" color={colors.textMuted} style={{ marginTop: 14 }}>
          {note}
        </Text>
        <Text variant="meta" style={{ marginTop: 6 }}>
          Coming in a later milestone
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80,
  },
});
