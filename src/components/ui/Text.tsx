import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

/**
 * XLR8 typography primitive.
 *
 * The signature of the design is a deliberate pairing: a warm literary SERIF
 * for expressive/long-form moments (synopsis, hero quotes) and a bold ROUNDED
 * SANS for all UI text (titles, labels, buttons). Every piece of text in the
 * app goes through this component so the pairing is always present and the
 * system default font is never used.
 */

export type TextVariant =
  | 'hero' // serif, huge — the editorial hero moment
  | 'serif' // serif body — synopsis, quotes
  | 'title' // rounded sans, screen titles (chunky)
  | 'heading' // rounded sans, section headers
  | 'label' // rounded sans, card titles / nav
  | 'button' // rounded sans, CTA text
  | 'meta' // rounded sans, small metadata
  | 'eyebrow'; // rounded sans, tiny caps label above a title

const variantStyle: Record<TextVariant, object> = {
  hero: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 42,
    color: colors.text,
    letterSpacing: 0.2,
  },
  serif: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.sansExtra,
    fontSize: 34,
    lineHeight: 40,
    color: colors.text,
    letterSpacing: 0.2,
  },
  heading: {
    fontFamily: fonts.sansExtra,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.text,
  },
  button: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.eyebrow,
    letterSpacing: 0.6,
  },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  italic?: boolean;
}

export function Text({ variant = 'label', color, italic, style, ...rest }: TextProps) {
  const base = variantStyle[variant];
  const italicFamily =
    italic && (variant === 'hero' || variant === 'serif') ? fonts.serifItalic : undefined;
  return (
    <RNText
      style={StyleSheet.flatten([
        base,
        italicFamily ? { fontFamily: italicFamily } : null,
        color ? { color } : null,
        style,
      ])}
      {...rest}
    />
  );
}
