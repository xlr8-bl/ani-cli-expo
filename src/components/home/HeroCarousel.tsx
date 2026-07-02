import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { GenreChip } from '@/components/ui/GenreChip';
import { colors } from '@/theme/tokens';
import { displayTitle } from '@/lib/anilist/types';
import type { Media } from '@/lib/anilist/types';

/**
 * Home hero carousel — full-bleed banner art with the title overlaid, one
 * spotlight show per page, swipeable. Rendered inside ScrollBlendScreen's hero
 * slot so it collapses/ghosts into the sticky header on scroll. Dot indicators
 * float at the bottom-right so they don't fight the text block.
 */
export function HeroCarousel({
  items,
  height,
  onPressItem,
}: {
  items: Media[];
  height: number;
  onPressItem: (m: Media) => void;
}) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<Media>>(null);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={{ height, width }}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(m) => String(m.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <HeroSlide media={item} width={width} height={height} onPress={() => onPressItem(item)} />
        )}
      />
      <View style={styles.dots} pointerEvents="none">
        {items.map((m, i) => (
          <View key={m.id} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function HeroSlide({
  media,
  width,
  height,
  onPress,
}: {
  media: Media;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const art = media.bannerImage ?? media.coverImage.extraLarge ?? media.coverImage.large;
  const genre = media.genres[0];
  const meta = [
    media.genres.slice(0, 2).join(' · '),
    media.seasonYear ? String(media.seasonYear) : null,
    media.episodes ? `${media.episodes} eps` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ width, height }}>
      <Image
        source={art ?? undefined}
        style={[StyleSheet.absoluteFill, { backgroundColor: media.coverImage.color ?? '#101018' }]}
        contentFit="cover"
        transition={300}
      />
      {/* top scrim for the brand row, bottom scrim bleeding into true black */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
        locations={[0, 0.35]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', '#000000']}
        locations={[0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <Badge label="Spotlight" />
          {typeof media.averageScore === 'number' && media.averageScore > 0 && (
            <View style={styles.scoreChip}>
              <Ionicons name="star" size={12} color="#FFD54A" />
              <Text variant="eyebrow" color={colors.text} style={{ marginLeft: 4 }}>
                {(media.averageScore / 10).toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        <Text variant="hero" numberOfLines={2} style={styles.title}>
          {displayTitle(media.title)}
        </Text>
        {meta ? (
          <Text variant="meta" style={{ marginTop: 8 }}>
            {meta}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable style={styles.playBtn} onPress={onPress}>
            <Ionicons name="play" size={16} color={colors.textInverse} />
            <Text variant="button" color={colors.textInverse} style={{ marginLeft: 6 }}>
              Details
            </Text>
          </Pressable>
          {genre ? <GenreChip label={genre} style={styles.genre} onPress={onPress} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  genre: {
    paddingVertical: 11,
  },
  dots: {
    position: 'absolute',
    right: 20,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: colors.text,
  },
});
