import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * On-device watchlist — the device is the account. Persisted via
 * AsyncStorage; uninstalling the app wipes it, by design.
 */

export interface SavedShow {
  id: number;
  title: string;
  cover: string | null;
  color: string | null;
  addedAt: number;
}

interface LibraryState {
  watchlist: Record<number, SavedShow>;
  toggle: (show: Omit<SavedShow, 'addedAt'>) => void;
  remove: (id: number) => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      watchlist: {},
      toggle: (show) =>
        set((state) => {
          const next = { ...state.watchlist };
          if (next[show.id]) {
            delete next[show.id];
          } else {
            next[show.id] = { ...show, addedAt: Date.now() };
          }
          return { watchlist: next };
        }),
      remove: (id) =>
        set((state) => {
          const next = { ...state.watchlist };
          delete next[id];
          return { watchlist: next };
        }),
    }),
    {
      name: 'xlr8-library',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Watchlist as a newest-first array. */
export function watchlistArray(watchlist: Record<number, SavedShow>): SavedShow[] {
  return Object.values(watchlist).sort((a, b) => b.addedAt - a.addedAt);
}