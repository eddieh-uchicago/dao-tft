import { create } from "zustand";
import type { AugmentId, ComponentId, GameState, UnitId } from "@/engine/types";

export const MAX_OFFERS = 3;
export const MAX_CONTEST = 3;
export const LEVELS = [3, 4, 5, 6];

interface GameStore extends GameState {
  /** Augments currently on offer, previewed before the player commits. */
  offers: AugmentId[];
  /** The flow moves on without a board / augment when the player says they have none yet. */
  boardSkipped: boolean;
  augmentSkipped: boolean;
  /** Player level caps how many units can be on the board. */
  level: number;
  setLevel: (level: number) => void;
  addComponent: (id: ComponentId) => void;
  removeComponent: (id: ComponentId) => void;
  toggleUnit: (id: UnitId) => void;
  skipBoard: () => void;
  skipAugment: () => void;
  toggleOffer: (id: AugmentId) => void;
  takeAugment: (id: AugmentId) => void;
  dropAugment: (id: AugmentId) => void;
  setContested: (unit: UnitId, count: number) => void;
  reset: () => void;
}

const initial = {
  components: {} as GameState["components"],
  board: [] as UnitId[],
  level: 4,
  boardSkipped: false,
  augmentSkipped: false,
  augments: [] as AugmentId[],
  offers: [] as AugmentId[],
  scout: { contested: {} } as GameState["scout"],
};

export const useGame = create<GameStore>((set) => ({
  ...initial,
  addComponent: (id) => set((s) => ({ components: { ...s.components, [id]: (s.components[id] ?? 0) + 1 } })),
  removeComponent: (id) =>
    set((s) => {
      const next = { ...s.components, [id]: Math.max(0, (s.components[id] ?? 0) - 1) };
      if (!next[id]) delete next[id];
      return { components: next };
    }),
  setLevel: (level) => set((s) => ({ level, board: s.board.slice(0, level) })),
  toggleUnit: (id) =>
    set((s) => {
      if (s.board.includes(id)) return { board: s.board.filter((u) => u !== id) };
      return s.board.length < s.level ? { board: [...s.board, id] } : s;
    }),
  skipBoard: () => set({ boardSkipped: true }),
  skipAugment: () => set({ augmentSkipped: true }),
  toggleOffer: (id) =>
    set((s) => {
      if (s.offers.includes(id)) return { offers: s.offers.filter((o) => o !== id) };
      return s.offers.length < MAX_OFFERS ? { offers: [...s.offers, id] } : s;
    }),
  takeAugment: (id) =>
    set((s) => ({
      augments: s.augments.includes(id) ? s.augments : [...s.augments, id],
      offers: [],
    })),
  dropAugment: (id) => set((s) => ({ augments: s.augments.filter((a) => a !== id) })),
  setContested: (unit, count) =>
    set((s) => {
      const contested = { ...s.scout.contested };
      const n = Math.max(0, Math.min(MAX_CONTEST, count));
      if (n) contested[unit] = n;
      else delete contested[unit];
      return { scout: { contested } };
    }),
  reset: () => set(initial),
}));
