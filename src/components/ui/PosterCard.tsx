import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { Badge } from './Badge';
import { colors } from '@/theme/tokens';

/**
 * Vertical 2:3 poster card used in horizontal rails (Trending, Popular…).
 * Rounded cover art with the title underneath; optional NEW badge and score.
 */
export function PosterCard({
  title,
  image,
  color,
  score,
  badge,
  width = 128,
  onPress,
}: {
  title: string;
  image?: string | null;
  /** AniList cover accent color — used as the loading placeholder fill. */
  color?: string | null;
  /** 0-100 AniList average score, rendered as x.x */
  score?: number | null;
  badge?: string;
  width?: number;
  onPress?: () => void;
}) {
  const height = Math.round(width * 1.5);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.posterWrap, { width, height }]}>
        <Image
          source={image ?? undefined}
          style={[styles.poster, { backgroundColor: color ?? colors.surfaceAlt }]}
          contentFit="cover"
          transition={250}
        />
        {badge ? (
          <View style={styles.badge}>
            <Badge label={badge} />
          </View>
        ) : null}
        {typeof score === 'number' && score > 0 ? (
          <View style={styles.score}>
            <Text variant="eyebrow" color={colors.text} style={styles.scoreText}>
              ★ {(score / 10).toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="meta" color={colors.text} numberOfLines={2} style={styles.title}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  posterWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  score: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  scoreText: {
    fontSize: 10,
    lineHeight: 13,
  },
  title: {
    marginTop: 8,
    fontSize: 13,
  },
});
