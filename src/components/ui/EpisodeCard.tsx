import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '@/theme/tokens';

/**
 * Episode row — a dedicated pattern, not the generic content card.
 * Borderless on true black (whitespace does the separation): a 16:9
 * widescreen still on the LEFT with a floating play affordance, the episode
 * number chip and download chip overlaid on the image, and the title +
 * duration/date meta on the right. NEW episodes get the accent badge.
 */
export function EpisodeCard({
  number,
  title,
  image,
  placeholderColor = colors.surfaceAlt,
  duration,
  airedAt,
  meta,
  filler,
  recap,
  isNew,
  onPress,
  onDownload,
}: {
  number: number;
  title?: string | null;
  image?: string | null;
  placeholderColor?: string;
  /** Minutes. */
  duration?: number | null;
  /** ISO date string. */
  airedAt?: string | null;
  /** Overrides the computed duration/date line (e.g. "Episode 39 · 2h ago"). */
  meta?: string;
  filler?: boolean;
  recap?: boolean;
  isNew?: boolean;
  onPress?: () => void;
  onDownload?: () => void;
}) {
  const metaLine =
    meta ??
    [duration ? `${duration} min` : null, formatAirDate(airedAt)].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.row}>
      <View style={styles.thumbWrap}>
        <Image
          source={image ?? undefined}
          style={[styles.thumb, { backgroundColor: placeholderColor }]}
          contentFit="cover"
          transition={200}
        />
        {/* floating play affordance */}
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </View>
        {/* episode number chip */}
        <View style={styles.epChip}>
          <Text variant="eyebrow" color={colors.text} style={styles.epChipText}>
            E{number}
          </Text>
        </View>
        {isNew && (
          <View style={styles.newBadge}>
            <Text variant="eyebrow" color="#FFFFFF" style={styles.newText}>
              New
            </Text>
          </View>
        )}
        {/* Filler/recap warning lives on the artwork where it can't be missed */}
        {(filler || recap) && (
          <View style={[styles.fillerTag, recap && !filler && styles.recapTag]}>
            <Text variant="eyebrow" color="#FFFFFF" style={styles.fillerText}>
              {filler ? 'Filler' : 'Recap'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.textCol}>
        <Text variant="label" numberOfLines={2} style={styles.title}>
          {title || `Episode ${number}`}
        </Text>
        {metaLine ? (
          <View style={styles.metaRow}>
            <Text variant="meta">{metaLine}</Text>
          </View>
        ) : null}
      </View>

      {onDownload && (
        <TouchableOpacity
          onPress={onDownload}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.downloadBtn}
        >
          <Ionicons name="download-outline" size={17} color={colors.text} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatAirDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const THUMB_W = 148;
const THUMB_H = 83; // 16:9

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  thumbWrap: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -15,
    marginLeft: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  epChip: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  epChipText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  newBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newText: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  fillerTag: {
    position: 'absolute',
    right: 6,
    top: 6,
    backgroundColor: '#C7601E',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recapTag: {
    backgroundColor: '#4B4E55',
  },
  fillerText: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  downloadBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginLeft: 12,
  },
  textCol: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
});