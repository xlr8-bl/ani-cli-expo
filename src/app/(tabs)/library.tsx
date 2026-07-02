import { View, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { PosterCard } from '@/components/ui/PosterCard';
import { colors } from '@/theme/tokens';
import { useLibrary, watchlistArray } from '@/store/library';

const COLUMNS = 3;
const GUTTER = 14;

/** Watchlist grid — persisted on-device, populated by the Detail bookmark. */
export default function Library() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const watchlist = useLibrary((s) => s.watchlist);
  const items = watchlistArray(watchlist);

  const posterW = Math.floor((width - 20 * 2 - GUTTER * (COLUMNS - 1)) / COLUMNS);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Text variant="title" style={styles.title}>
        Library
      </Text>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={44} color={colors.borderStrong} />
          <Text variant="label" color={colors.textMuted} style={{ marginTop: 14 }}>
            Your watchlist is empty
          </Text>
          <Text variant="meta" style={{ marginTop: 6, textAlign: 'center' }}>
            Tap the bookmark on any show to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => String(s.id)}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GUTTER, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 18, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PosterCard
              title={item.title}
              image={item.cover}
              color={item.color}
              width={posterW}
              onPress={() =>
                router.push({ pathname: '/anime/[id]', params: { id: String(item.id) } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80,
    paddingHorizontal: 40,
  },
});