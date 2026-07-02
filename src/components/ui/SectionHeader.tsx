import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '@/theme/tokens';

/**
 * Section header: bold white title on the left, right-aligned "See All ›" link.
 * A section never ships as a bare title with no way to see more.
 */
export function SectionHeader({
  title,
  onSeeAll,
  seeAllLabel = 'See All',
}: {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <Text variant="heading">{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.link}>
          <Text variant="button" color={colors.textMuted}>
            {seeAllLabel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    marginTop: 8,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
