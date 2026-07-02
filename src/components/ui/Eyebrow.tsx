import { Text } from './Text';
import { StyleProp, TextStyle } from 'react-native';

/**
 * Small gray uppercase eyebrow label that sits above a bold title on cards.
 * ("GUIDED SCRIPTURE" in the reference → e.g. "EPISODE 12" / "CONTINUE" here.)
 */
export function Eyebrow({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text variant="eyebrow" style={style}>
      {children.toUpperCase()}
    </Text>
  );
}
