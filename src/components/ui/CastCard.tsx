import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { colors } from '@/theme/tokens';

/**
 * Character + voice-actor cell for the horizontal cast rail: circular
 * character portrait, name, and the VA's name muted below.
 */
export function CastCard({
  name,
  role,
  image,
  vaName,
}: {
  name: string;
  role?: string | null;
  image?: string | null;
  vaName?: string | null;
}) {
  return (
    <View style={styles.cell}>
      <Image source={image ?? undefined} style={styles.avatar} contentFit="cover" transition={200} />
      <Text variant="meta" color={colors.text} numberOfLines={2} style={styles.name}>
        {name}
      </Text>
      {vaName ? (
        <Text variant="meta" numberOfLines={1} style={styles.va}>
          {vaName}
        </Text>
      ) : role ? (
        <Text variant="meta" numberOfLines={1} style={styles.va}>
          {role}
        </Text>
      ) : null}
    </View>
  );
}

const AVATAR = 76;

const styles = StyleSheet.create({
  cell: {
    width: AVATAR + 16,
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceAlt,
  },
  name: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  va: {
    marginTop: 2,
    fontSize: 11,
    textAlign: 'center',
  },
});