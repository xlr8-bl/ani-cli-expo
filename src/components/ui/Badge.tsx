import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors } from '@/theme/tokens';

/**
 * Small caps badge. Default = accent (used for NEW). Pass a color for the
 * hidden "★ 1.0 community" rating chip etc.
 */
export function Badge({
  label,
  color = colors.accent,
  textColor = '#FFFFFF',
}: {
  label: string;
  color?: string;
  textColor?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text variant="eyebrow" color={textColor} style={styles.text}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
  },
});
