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
import { FilterPill } from '@/components/ui/FilterPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme/tokens';
import { useAnimeDetail } from '@/lib/anilist/hooks';
import {
  displayTitle,
  plainDescription,
  sentenceCaseEnum,
  formatLabel,
} from '@/lib/anilist/types';
import type { MediaDetail, RelationEdge } from '@/lib/anilist/types';
import { buildEpisodeList } from '@/lib/episodes';
import { useEpisodeTitles } from '@/lib/jikan';
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

  // --- Season-aware episodes ------------------------------------------------
  // The episode list is bound to a selected season (default: this entry).
  // Selecting a pill swaps the list in place by fetching that season's detail;
  // the chain grows as more of it is discovered through each season's relations.
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const activeSeasonId = seasonId ?? Number(id);
  const seasonDetail = useAnimeDetail(activeSeasonId);
  const seasonMedia = seasonDetail.data;

  const seasons = useMemo(() => {
    const byId = new Map<number, SeasonEntry>();
    for (const s of media ? seasonChain(media) : []) byId.set(s.id, s);
    for (const s of seasonMedia && seasonMedia !== media ? seasonChain(seasonMedia) : [])
      if (!byId.has(s.id)) byId.set(s.id, s);
    const sorted = [...byId.values()].sort((a, b) => a.year - b.year);
    // Entries whose titles don't say "Season N" fall back to their ordinal in
    // the chain, so the first pill reads "Season 1", not a bare year.
    return sorted.map((s, i) => ({
      ...s,
      label: /^Season \d+$/.test(s.label) ? s.label : `Season ${i + 1}`,
    }));
  }, [media, seasonMedia]);

  const episodes = useMemo(() => (seasonMedia ? buildEpisodeList(seasonMedia) : []), [seasonMedia]);
  // Complete episode names come from Jikan (MAL); the preview only ever shows
  // episodes 1..8, which live on Jikan page 1.
  const episodeNames = useEpisodeTitles(seasonMedia?.idMal, 1);
  const preview = episodes.slice(0, EPISODE_PREVIEW);

  const related = useMemo(() => (media ? relatedAnime(media) : []), [media]);
  const cast = media?.characters.edges ?? [];

  const openEpisodes = () =>
    router.push({ pathname: '/anime/[id]/episodes', params: { id: String(activeSeasonId) } });

  return (
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
          {/* Synopsis — the serif editorial moment, clamped with See more */}
          <SectionHeader title="Synopsis" />
          <Synopsis text={plainDescription(media.description)} />

          {/* Episodes — season aware. Pills swap the list in place; the full
              list moves to its own page past the preview threshold. */}
          <SectionHeader
            title="Episodes"
            onSeeAll={episodes.length > EPISODE_PREVIEW ? openEpisodes : undefined}
            seeAllLabel={episodes.length > EPISODE_PREVIEW ? `All ${episodes.length}` : undefined}
          />
          {seasons.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {seasons.map((s) => (
                <FilterPill
                  key={s.id}
                  label={s.label}
                  active={s.id === activeSeasonId}
                  onPress={() => setSeasonId(s.id)}
                />
              ))}
            </ScrollView>
          )}
          {seasonDetail.isPending ? (
            <View style={{ paddingHorizontal: 20, gap: 14, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Skeleton style={{ width: 148, height: 83, borderRadius: 14 }} />
                <Skeleton style={{ flex: 1, height: 16, borderRadius: 8, alignSelf: 'center' }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Skeleton style={{ width: 148, height: 83, borderRadius: 14 }} />
                <Skeleton style={{ flex: 1, height: 16, borderRadius: 8, alignSelf: 'center' }} />
              </View>
            </View>
          ) : (
            <>
              {preview.map((ep) => {
                const jikan = episodeNames.data?.get(ep.number);
                return (
                  <EpisodeCard
                    key={`${activeSeasonId}-${ep.number}`}
                    number={ep.number}
                    title={ep.title ?? jikan?.title}
                    image={ep.thumbnail ?? seasonMedia?.coverImage.large}
                    placeholderColor={seasonMedia?.coverImage.color ?? colors.surfaceAlt}
                    duration={seasonMedia?.duration}
                    airedAt={jikan?.aired}
                    filler={jikan?.filler}
                    isNew={ep.isNew}
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
          )}

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
  );
}

// --- Seasons & related derivation -----------------------------------------

const SEASON_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);

interface SeasonEntry {
  id: number;
  year: number;
  label: string;
}

/** Direct prequel/sequel chain (this show included), ordered by year. */
function seasonChain(media: MediaDetail): SeasonEntry[] {
  const entries = media.relations.edges
    .filter(
      (e) =>
        (e.relationType === 'SEQUEL' || e.relationType === 'PREQUEL') &&
        e.node.type === 'ANIME' &&
        SEASON_FORMATS.has(e.node.format ?? ''),
    )
    .map((e) => ({
      id: e.node.id,
      year: e.node.seasonYear ?? (e.relationType === 'PREQUEL' ? -1 : 9999),
      label: shortSeasonLabel(e.node.seasonYear, displayTitle(e.node.title)),
    }));
  if (entries.length === 0) return [];
  entries.push({
    id: media.id,
    year: media.seasonYear ?? 0,
    label: shortSeasonLabel(media.seasonYear, displayTitle(media.title)),
  });
  return entries.sort((a, b) => a.year - b.year);
}

function shortSeasonLabel(year: number | null, title: string): string {
  const m = /season\s*(\d+)/i.exec(title);
  if (m) return `Season ${m[1]}`;
  return year ? String(year) : title.slice(0, 14);
}

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
  synopsisWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  seeMore: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
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