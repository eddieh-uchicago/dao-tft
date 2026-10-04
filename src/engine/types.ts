import type { Comp, Tier } from "@/data/schema";

export type ComponentId = string;
export type UnitId = string;
export type ItemId = string;
export type AugmentId = string;

/** Component id -> how many the player holds. */
export type ComponentBag = Record<ComponentId, number>;

export interface ScoutState {
  /** Unit id -> number of opponents seen holding or playing it. */
  contested: Record<UnitId, number>;
}

export interface GameState {
  components: ComponentBag;
  /** Units on the player's board right now (2-1). */
  board: UnitId[];
  augments: AugmentId[];
  scout: ScoutState;
}

/** A target item with its recipe resolved against the catalog. */
export interface TargetEntry {
  item: ItemId;
  unit: UnitId;
  weight: number;
  components: [ComponentId, ComponentId];
}

export interface BuiltItem extends TargetEntry {
  /** Components consumed to craft it. */
  uses: [ComponentId, ComponentId];
}

/** A target item that is not built: what is already in hand and what is still needed. */
export interface PendingItem extends TargetEntry {
  have: ComponentId[];
  need: ComponentId[];
}

export interface Allocation {
  built: BuiltItem[];
  pending: PendingItem[];
  leftover: ComponentBag;
  /** Built weight plus partial credit for leftover components. */
  value: number;
}

export type Fit = "S" | "A" | "B" | "C" | "D";
export type RecTag = "lock-in" | "flex-enabler";

export interface Recommendation {
  comp: Comp;
  tier: Tier;
  score: number;
  fit: Fit;
  coverage: number;
  allocation: Allocation;
  augmentBonus: number;
  augmentNotes: string[];
  scoutPenalty: number;
  /** Board units that appear in this comp's opener or end board. */
  boardMatches: UnitId[];
  boardBonus: number;
  tags: RecTag[];
}

export interface SlamSuggestion {
  item: ItemId;
  unit: UnitId;
  /** Slugs of top comps that want this item. */
  comps: string[];
  uses: [ComponentId, ComponentId];
  weight: number;
}

export interface CarouselTarget {
  component: ComponentId;
  /** Largest tier-weighted increase in craftable item value this component gives any comp. */
  gain: number;
  bestComp: string;
  /** Items that become buildable that were not before, for the best comp. */
  unlocks: ItemId[];
  /** Comps that enter the top 3 if this component is hit. */
  entersTop3: string[];
}

export interface AugmentOutcome {
  augment: AugmentId;
  ranking: Recommendation[];
  topChanged: boolean;
}

export interface CarrySwap {
  comp: Comp;
  sharedItems: ItemId[];
}
