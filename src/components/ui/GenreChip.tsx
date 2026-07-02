import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { genreColor, radius } from '@/theme/tokens';

/**
 * Flat, saturated, solid-color category chip. Each genre keeps a consistent
 * assigned color (see theme/tokens genreColors). Bold white first-letter-
 * capital label, no gradient, no border — this is how genre/category browsing
 * should look: a colorful rounded-rectangle grid, not a plain gray list.
 */

/** "action" → "Action"; leaves the rest of the string's casing alone. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function GenreChip({
  label,
  color,
  onPress,
  onLongPress,
  style,
}: {
  label: string;
  /** Override the assigned genre color. */
  color?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: object;
}) {
  const fill = color ?? genreColor(label);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: fill, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text variant="button" color="#FFFFFF" numberOfLines={1} style={styles.label}>
        {capitalize(label)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.chip,
    paddingVertical: 22,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 0.4,
  },
});
