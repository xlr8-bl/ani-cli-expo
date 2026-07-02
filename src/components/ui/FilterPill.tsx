import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '@/theme/tokens';

/**
 * Fully-rounded segment/filter capsule.
 *   active   = solid white fill + black text
 *   inactive = dark-outlined pill + white text
 * (matches the "My Plans / Find Plans / Saved" row in the reference).
 */
export function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.active : styles.inactive,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text variant="button" color={active ? colors.textInverse : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  active: {
    backgroundColor: '#FFFFFF',
  },
  inactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
