import { create } from "zustand";
import type { AugmentId, ComponentId, GameState, ItemId, UnitId } from "@/engine/types";

export const MAX_CONTEST = 3;
export const LEVELS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

interface GameStore extends GameState {
  /** The flow moves on without a board / augment when the player says they have none yet. */
  boardSkipped: boolean;
  augmentSkipped: boolean;
  /** Player level caps how many units can be on the board. */
  level: number;
  setLevel: (level: number) => void;
  addComponent: (id: ComponentId) => void;
  removeComponent: (id: ComponentId) => void;
  addItem: (id: ItemId) => void;
  removeItem: (id: ItemId) => void;
  toggleUnit: (id: UnitId) => void;
  skipBoard: () => void;
  skipAugment: () => void;
  /**
   * Select or deselect the augment for one selection (0 = 2-1, 1 = 3-2, 2 = 4-2).
   * Selections fill in order, so `augments[i]` is always the pick at selection i.
   */
  pickAugment: (selection: number, id: AugmentId) => void;
  setContested: (unit: UnitId, count: number) => void;
  reset: () => void;
}

const initial = {
  components: {} as GameState["components"],
  items: [] as ItemId[],
  board: [] as UnitId[],
  level: 4,
  boardSkipped: false,
  augmentSkipped: false,
  augments: [] as AugmentId[],
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
  addItem: (id) => set((s) => ({ items: [...s.items, id] })),
  removeItem: (id) =>
    set((s) => {
      const i = s.items.lastIndexOf(id);
      return i < 0 ? s : { items: s.items.filter((_, j) => j !== i) };
    }),
  setLevel: (level) => set((s) => ({ level, board: s.board.slice(0, level) })),
  toggleUnit: (id) =>
    set((s) => {
      if (s.board.includes(id)) return { board: s.board.filter((u) => u !== id) };
      return s.board.length < s.level ? { board: [...s.board, id] } : s;
    }),
  skipBoard: () => set({ boardSkipped: true }),
  skipAugment: () => set({ augmentSkipped: true }),
  pickAugment: (selection, id) =>
    set((s) => {
      // Clearing a pick also clears the later ones, which depended on it.
      if (s.augments[selection] === id) return { augments: s.augments.slice(0, selection) };
      if (selection > s.augments.length || s.augments.some((a, i) => a === id && i !== selection)) return s;
      return { augments: [...s.augments.slice(0, selection), id, ...s.augments.slice(selection + 1)] };
    }),
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
