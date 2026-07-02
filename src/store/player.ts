import { create } from 'zustand';
import type { ResolvedSource } from '@/lib/allanime/types';

/** Hands a resolved source from the picker sheet to the /watch player. */
export interface NowPlaying {
  source: ResolvedSource;
  title: string;
  episodeNumber: number;
  /** All resolved qualities, so the player can offer an in-place switch. */
  alternates: ResolvedSource[];
}

interface PlayerState {
  now: NowPlaying | null;
  setNow: (n: NowPlaying) => void;
  clear: () => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  now: null,
  setNow: (now) => set({ now }),
  clear: () => set({ now: null }),
}));
