import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Eyebrow } from './Eyebrow';
import { Badge } from './Badge';
import { colors, radius } from '@/theme/tokens';

/**
 * Standard XLR8 content card — the thumbnail-right list-row pattern.
 * Rounded dark card, image on the RIGHT, text block on the LEFT:
 *   eyebrow → bold title → meta line (with play affordance).
 * Reused for episode cards, Continue Watching, and search-result rows.
 */
export function ContentCard({
  eyebrow,
  title,
  meta,
  image,
  placeholderColor = colors.surfaceAlt,
  badge,
  showPlay = true,
  progress,
  onPress,
}: {
  eyebrow?: string;
  title: string;
  meta?: string;
  image?: ImageSource | string;
  placeholderColor?: string;
  badge?: string;
  showPlay?: boolean;
  /** 0..1 resume progress bar under the thumbnail. */
  progress?: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={styles.textCol}>
        {badge ? (
          <View style={styles.badgeRow}>
            <Badge label={badge} />
          </View>
        ) : eyebrow ? (
          <Eyebrow>{eyebrow}</Eyebrow>
        ) : null}
        <Text variant="label" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {meta && (
          <View style={styles.metaRow}>
            {showPlay && (
              <Ionicons name="play" size={13} color={colors.textMuted} style={styles.playIcon} />
            )}
            <Text variant="meta">{meta}</Text>
          </View>
        )}
      </View>

      <View style={styles.thumbWrap}>
        <Image
          source={image}
          style={[styles.thumb, { backgroundColor: placeholderColor }]}
          contentFit="cover"
          transition={200}
        />
        {typeof progress === 'number' && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const THUMB = 96;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  textCol: {
    flex: 1,
    marginRight: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  title: {
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  playIcon: {
    marginRight: 5,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  progressTrack: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
