import { create } from "zustand";
import type { AugmentId, ComponentId, GameState, UnitId } from "@/engine/types";

export const MAX_OFFERS = 3;
export const MAX_CONTEST = 3;

interface GameStore extends GameState {
  /** Augments currently on offer, previewed before the player commits. */
  offers: AugmentId[];
  addComponent: (id: ComponentId) => void;
  removeComponent: (id: ComponentId) => void;
  toggleOffer: (id: AugmentId) => void;
  takeAugment: (id: AugmentId) => void;
  dropAugment: (id: AugmentId) => void;
  setContested: (unit: UnitId, count: number) => void;
  reset: () => void;
}

const initial = {
  components: {} as GameState["components"],
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
