import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScrollBlendScreen } from '@/components/header/ScrollBlendHeader';
import { Text } from '@/components/ui/Text';
import { GenreChip } from '@/components/ui/GenreChip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EpisodeCard } from '@/components/ui/EpisodeCard';
import { PosterCard } from '@/components/ui/PosterCard';
import { CastCard } from '@/components/ui/CastCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme/tokens';
import { useAnimeDetail } from '@/lib/anilist/hooks';
import { useSeasonChain } from '@/lib/anilist/seasons';
import {
  displayTitle,
  plainDescription,
  sentenceCaseEnum,
  formatLabel,
} from '@/lib/anilist/types';
import type { MediaDetail, RelationEdge } from '@/lib/anilist/types';
import { buildEpisodeList } from '@/lib/episodes';
import { useEpisodeTitles } from '@/lib/jikan';
import { useAniZipEpisodes } from '@/lib/anizip';
import { useLibrary } from '@/store/library';

/** Placeholder until the downloads milestone lands. */
export function notYetDownloadable() {
  Alert.alert('Downloads', 'Downloads are coming in a later update.');
}

const HERO_HEIGHT = 420;
/** Episodes shown inline on Detail; beyond this the full list gets its own page. */
const EPISODE_PREVIEW = 8;

export default function AnimeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useAnimeDetail(Number(id));

  const media = detail.data;
  const title = media ? displayTitle(media.title) : ' ';

  // --- Season navigation ----------------------------------------------------
  // Everything is bound to the OPENED show — no in-place season swapping. The
  // episode list always starts at episode 1 of this show, and playback always
  // resolves this exact season. The season row is the FULL prequel/sequel
  // chain (traversed, not one-hop) so labels + navigation are stable on every
  // season's page.
  const seasonChainQuery = useSeasonChain(Number(id));
  const seasons = seasonChainQuery.data ?? [];

  const episodes = useMemo(() => (media ? buildEpisodeList(media) : []), [media]);
  // Episode names resolve through a chain of sources so nothing shows as a
  // bare "Episode N": streaming platforms (AniList) → MAL (Jikan) → ani.zip.
  const episodeNames = useEpisodeTitles(media?.idMal, 1);
  const aniZip = useAniZipEpisodes(media?.id);
  const preview = episodes.slice(0, EPISODE_PREVIEW);

  const related = useMemo(() => (media ? relatedAnime(media) : []), [media]);
  const cast = media?.characters.edges ?? [];

  // Episode tap → custom player screen (auto-resolves + plays).
  const playEpisode = (n: number) =>
    router.push({ pathname: '/anime/[id]/watch', params: { id: String(id), ep: String(n) } });

  const goToSeason = (seasonAnilistId: number) =>
    router.push({ pathname: '/anime/[id]', params: { id: String(seasonAnilistId) } });
  const openEpisodes = () =>
    router.push({ pathname: '/anime/[id]/episodes', params: { id: String(id) } });

  return (
    <>
      <ScrollBlendScreen
      title={title}
      heroHeight={HERO_HEIGHT}
      headerRight={<HeaderButtons media={media} onBack={() => router.back()} />}
      hero={
        detail.isPending ? (
          <View style={styles.heroSkeleton}>
            <Skeleton style={{ width: '75%', height: 34, borderRadius: 10 }} />
            <Skeleton style={{ width: 180, height: 14, borderRadius: 7, marginTop: 12 }} />
          </View>
        ) : media ? (
          <Hero media={media} />
        ) : (
          <View style={styles.heroSkeleton}>
            <Text variant="label" color={colors.textMuted}>
              Couldn&apos;t load this title.
            </Text>
            <Pressable onPress={() => detail.refetch()} style={{ marginTop: 10 }}>
              <Text variant="button" color={colors.accent}>
                Retry
              </Text>
            </Pressable>
          </View>
        )
      }
    >
      {detail.isPending ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Skeleton style={{ width: '100%', height: 16, borderRadius: 8 }} />
          <Skeleton style={{ width: '100%', height: 16, borderRadius: 8 }} />
          <Skeleton style={{ width: '70%', height: 16, borderRadius: 8 }} />
        </View>
      ) : media ? (
        <>
          {/* Start playback from the beginning */}
          <Pressable style={styles.playCta} onPress={() => playEpisode(1)}>
            <Ionicons name="play" size={18} color={colors.textInverse} />
            <Text variant="button" color={colors.textInverse} style={{ marginLeft: 8 }}>
              Play Episode 1
            </Text>
          </Pressable>

          {/* Synopsis — the serif editorial moment, clamped with See more */}
          <SectionHeader title="Synopsis" />
          <Synopsis text={plainDescription(media.description)} />

          {/* Seasons — a row of season cards. The current season is highlighted;
              tapping another opens its own page (fresh, from episode 1). */}
          {seasons.length > 1 && (
            <>
              <SectionHeader title="Seasons" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonRow}
              >
                {seasons.map((s) => (
                  <SeasonCard
                    key={s.id}
                    label={s.label}
                    cover={s.cover}
                    color={s.color}
                    episodes={s.episodes}
                    active={s.id === Number(id)}
                    onPress={() => s.id !== Number(id) && goToSeason(s.id)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Episodes — always this show's episodes, from episode 1. */}
          <SectionHeader
            title="Episodes"
            onSeeAll={episodes.length > EPISODE_PREVIEW ? openEpisodes : undefined}
            seeAllLabel={episodes.length > EPISODE_PREVIEW ? `All ${episodes.length}` : undefined}
          />
          <>
            {preview.map((ep) => {
                const jikan = episodeNames.data?.get(ep.number);
                const zip = aniZip.data?.get(ep.number);
                return (
                  <EpisodeCard
                    key={ep.number}
                    number={ep.number}
                    title={ep.title ?? jikan?.title ?? zip?.title}
                    image={ep.thumbnail ?? zip?.image ?? media.coverImage.large}
                    placeholderColor={media.coverImage.color ?? colors.surfaceAlt}
                    duration={media.duration}
                    airedAt={jikan?.aired ?? zip?.airDate}
                    filler={jikan?.filler}
                    recap={jikan?.recap}
                    isNew={ep.isNew}
                    onPress={() => playEpisode(ep.number)}
                    onDownload={notYetDownloadable}
                  />
                );
              })}
              {episodes.length > EPISODE_PREVIEW && (
                <Pressable onPress={openEpisodes} style={styles.allEpisodesBtn}>
                  <Text variant="button">See all {episodes.length} episodes</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              )}
          </>

          {/* Cast */}
          {cast.length > 0 && (
            <>
              <SectionHeader title="Cast" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              >
                {cast.map((c) => (
                  <CastCard
                    key={c.node.id}
                    name={c.node.name.full}
                    role={sentenceCaseEnum(c.role)}
                    image={c.node.image.large}
                    vaName={c.voiceActors[0]?.name.full ?? null}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Related */}
          {related.length > 0 && (
            <>
              <SectionHeader title="Related" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              >
                {related.map((r) => (
                  <PosterCard
                    key={r.node.id}
                    title={displayTitle(r.node.title)}
                    image={r.node.coverImage.extraLarge ?? r.node.coverImage.large}
                    color={r.node.coverImage.color}
                    score={r.node.averageScore}
                    onPress={() =>
                      router.push({ pathname: '/anime/[id]', params: { id: String(r.node.id) } })
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Genres */}
          {media.genres.length > 0 && (
            <>
              <SectionHeader title="Genres" />
              <View style={styles.chipGrid}>
                {media.genres.map((g) => (
                  <View key={g} style={styles.chipCell}>
                    <GenreChip label={g} />
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      ) : null}
      </ScrollBlendScreen>
    </>
  );
}

// --- Related derivation ---------------------------------------------------

/** Everything else related (side stories, movies, specials, alt versions). */
function relatedAnime(media: MediaDetail): RelationEdge[] {
  const seen = new Set<number>();
  return media.relations.edges.filter((e) => {
    if (e.node.type !== 'ANIME') return false;
    if (e.relationType === 'SEQUEL' || e.relationType === 'PREQUEL') return false;
    if (seen.has(e.node.id)) return false;
    seen.add(e.node.id);
    return true;
  });
}

// --- Pieces ----------------------------------------------------------------

const SYNOPSIS_LINES = 5;

/** Serif synopsis clamped to a few lines with a See more / See less toggle. */
function Synopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  // Long text is assumed clamped up front (onTextLayout confirms on native
  // but never fires on web).
  const [clamped, setClamped] = useState(text.length > 280);

  return (
    <View style={styles.synopsisWrap}>
      <Text
        variant="serif"
        numberOfLines={expanded ? undefined : SYNOPSIS_LINES}
        onTextLayout={(e) => {
          if (!expanded && e.nativeEvent.lines.length >= SYNOPSIS_LINES) setClamped(true);
        }}
      >
        {text}
      </Text>
      {(clamped || expanded) && (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} style={styles.seeMore}>
          <Text variant="button" color={colors.accent}>
            {expanded ? 'See less' : 'See more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function Hero({ media }: { media: MediaDetail }) {
  const art = media.bannerImage ?? media.coverImage.extraLarge ?? media.coverImage.large;
  const meta = [
    formatLabel(media.format),
    media.season && media.seasonYear
      ? `${sentenceCaseEnum(media.season)} ${media.seasonYear}`
      : null,
    media.episodes ? `${media.episodes} eps` : null,
    sentenceCaseEnum(media.status),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={art ?? undefined}
        style={[StyleSheet.absoluteFill, { backgroundColor: media.coverImage.color ?? '#101018' }]}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', '#000000']}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <View style={styles.heroRow}>
          <Image
            source={media.coverImage.large ?? undefined}
            style={[styles.cover, { backgroundColor: media.coverImage.color ?? colors.surfaceAlt }]}
            contentFit="cover"
            transition={300}
          />
          <View style={{ flex: 1 }}>
            {typeof media.averageScore === 'number' && media.averageScore > 0 && (
              <View style={styles.scoreChip}>
                <Ionicons name="star" size={12} color="#FFD54A" />
                <Text variant="eyebrow" color={colors.text} style={{ marginLeft: 4 }}>
                  {(media.averageScore / 10).toFixed(1)}
                </Text>
              </View>
            )}
            <Text variant="title" numberOfLines={3} style={styles.heroTitle}>
              {displayTitle(media.title)}
            </Text>
            {meta ? (
              <Text variant="meta" style={{ marginTop: 6 }}>
                {meta}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/** A season entry in the Seasons row — cover + label; highlighted when current. */
function SeasonCard({
  label,
  cover,
  color,
  episodes,
  active,
  onPress,
}: {
  label: string;
  cover: string | null;
  color: string | null;
  episodes: number | null;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.seasonCard}>
      <View style={[styles.seasonThumbWrap, active && styles.seasonThumbActive]}>
        <Image
          source={cover ?? undefined}
          style={[styles.seasonThumb, { backgroundColor: color ?? colors.surfaceAlt }]}
          contentFit="cover"
          transition={200}
        />
        {active && (
          <View style={styles.seasonNow}>
            <Text variant="eyebrow" color="#FFFFFF" style={styles.seasonNowText}>
              Now
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="meta"
        color={active ? colors.text : colors.textMuted}
        numberOfLines={2}
        style={styles.seasonLabel}
      >
        {label}
      </Text>
      {episodes ? <Text variant="meta" style={styles.seasonEps}>{episodes} ep</Text> : null}
    </Pressable>
  );
}

/** Watchlist toggle + back, in the sticky header. */
function HeaderButtons({ media, onBack }: { media?: MediaDetail; onBack: () => void }) {
  const watchlist = useLibrary((s) => s.watchlist);
  const toggle = useLibrary((s) => s.toggle);
  const saved = media ? Boolean(watchlist[media.id]) : false;

  return (
    <View style={styles.headerBtns}>
      {media && (
        <Pressable
          style={styles.iconBtn}
          hitSlop={8}
          onPress={() =>
            toggle({
              id: media.id,
              title: displayTitle(media.title),
              cover: media.coverImage.large,
              color: media.coverImage.color,
            })
          }
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={19}
            color={saved ? colors.accent : colors.text}
          />
        </Pressable>
      )}
      <Pressable style={styles.iconBtn} hitSlop={8} onPress={onBack}>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSkeleton: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  cover: {
    width: 104,
    height: 156,
    borderRadius: 16,
  },
  scoreChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 31,
  },
  playCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 22,
    marginTop: -4,
  },
  synopsisWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  seeMore: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  seasonCard: {
    width: 104,
  },
  seasonThumbWrap: {
    width: 104,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  seasonThumbActive: {
    borderColor: colors.accent,
  },
  seasonThumb: {
    width: '100%',
    height: '100%',
  },
  seasonNow: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    backgroundColor: colors.accent,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  seasonNowText: {
    fontSize: 9,
    lineHeight: 12,
  },
  seasonLabel: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 15,
  },
  seasonEps: {
    marginTop: 1,
    fontSize: 11,
  },
  rail: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  allEpisodesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chipCell: {
    width: '50%',
    padding: 6,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,22,22,0.7)',
  },
});