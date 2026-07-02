import { Text } from './Text';
import { StyleProp, TextStyle } from 'react-native';

/**
 * Small gray eyebrow label that sits above a bold title on cards.
 * First-letter capital, like "Guided Scripture" in the reference —
 * e.g. "Episode 12" / "Trending #1" here.
 */
export function Eyebrow({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text variant="eyebrow" style={style}>
      {children.charAt(0).toUpperCase() + children.slice(1)}
    </Text>
  );
}
