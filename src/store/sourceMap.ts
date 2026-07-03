import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * On-device AniList↔AllAnime id mapping. A show resolves its AllAnime id once
 * (via title match or a manual link) and is cached forever, so subsequent
 * plays skip the search. Uninstalling wipes it, like everything else.
 */

export interface SourceMapping {
  allanimeId: string;
  allanimeName: string;
  /** Set true when the user linked it manually via the fallback UI. */
  manual: boolean;
  linkedAt: number;
}

interface SourceMapState {
  mappings: Record<number, SourceMapping>;
  setMapping: (anilistId: number, mapping: Omit<SourceMapping, 'linkedAt'>) => void;
  clearMapping: (anilistId: number) => void;
}

export const useSourceMap = create<SourceMapState>()(
  persist(
    (set) => ({
      mappings: {},
      setMapping: (anilistId, mapping) =>
        set((state) => ({
          mappings: { ...state.mappings, [anilistId]: { ...mapping, linkedAt: Date.now() } },
        })),
      clearMapping: (anilistId) =>
        set((state) => {
          const next = { ...state.mappings };
          delete next[anilistId];
          return { mappings: next };
        }),
    }),
    {
      name: 'xlr8-source-map',
      storage: createJSONStorage(() => AsyncStorage),
      // Bumped when the matcher changes so stale/wrong mappings (e.g. a season
      // matched before season-aware matching) are dropped and re-resolved.
      version: 2,
      migrate: () => ({ mappings: {} }),
    },
  ),
);
