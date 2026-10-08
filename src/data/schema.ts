import { z } from "zod";

export const TIERS = ["S", "A", "B", "C"] as const;
export const TierSchema = z.enum(TIERS);
export type Tier = z.infer<typeof TierSchema>;

const Id = z.string().min(1);

/** Most augments one comp may list (PRD open question 2 started at 5; one shared file makes 10 maintainable). */
export const MAX_COMP_AUGMENTS = 10;

/** How much an augment lifts a comp's score, by how much the comp wants it. */
export const AUGMENT_STRENGTH_BONUS = { core: 0.3, strong: 0.2, good: 0.1, avoid: -0.1 } as const;
export type AugmentStrength = keyof typeof AUGMENT_STRENGTH_BONUS;
const STRENGTHS = Object.keys(AUGMENT_STRENGTH_BONUS) as [AugmentStrength, ...AugmentStrength[]];

/** One completed item the comp wants, and the unit that should hold it. */
export const TargetItemSchema = z.object({
  item: Id,
  unit: Id,
  /** 3 = core BiS, 2 = strong alternative, 1 = flex. */
  weight: z.number().int().min(1).max(3),
});

export const CompSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  tier: TierSchema,
  /** Rerolls low-cost carries for 3 stars; without one of its carries on the board it is a worse pick. */
  reroll: z.boolean().default(false),
  summary: z.string().min(1),
  playWhen: z.array(z.string().min(1)).min(1),
  carries: z.array(Id).min(1),
  frontline: z.array(Id),
  endBoard: z.array(Id).min(1),
  targetItems: z.array(TargetItemSchema).min(1).max(14),
  opener: z.object({ units: z.array(Id).min(1), note: z.string() }),
  slams: z.array(z.object({ item: Id, unit: Id, note: z.string() })),
  stages: z.array(z.object({ stage: z.string().min(1), tip: z.string().min(1) })).min(1),
  /** Filled from src/data/comp-augments.json when the data loads; comp files leave it out. */
  augmentModifiers: z
    .array(z.object({ augment: Id, bonus: z.number().min(-0.4).max(0.4), note: z.string() }))
    .max(MAX_COMP_AUGMENTS)
    .default([]),
  frontlineAlternatives: z.array(Id),
  /** Artifacts and emblems the comp is built around; holding one pushes the player toward it. */
  keyItems: z.array(z.object({ item: Id, unit: Id })).default([]),
});

export type TargetItem = z.infer<typeof TargetItemSchema>;
export type Comp = z.infer<typeof CompSchema>;

export const AUGMENT_TIERS = ["silver", "gold", "prismatic"] as const;
export type AugmentTier = (typeof AUGMENT_TIERS)[number];

/** Hand-checked list of augments offered at one selection (see src/data/augments-*.json). */
export const StageAugmentsSchema = z.object({
  patch: z.string().min(1),
  source: z.string().url(),
  checkedAt: z.string(),
  note: z.string(),
  augments: z.array(z.object({ id: Id, tier: z.enum(AUGMENT_TIERS) })).min(1),
});
export type StageAugments = z.infer<typeof StageAugmentsSchema>;

/** Hand-edited augments each comp wants (see src/data/comp-augments.json). */
export const CompAugmentsSchema = z.object({
  patch: z.string().min(1),
  checkedAt: z.string(),
  sources: z.array(z.string().url()).min(1),
  note: z.string(),
  comps: z.record(
    z.string(),
    z
      .array(z.object({ augment: Id, strength: z.enum(STRENGTHS), note: z.string().min(1).optional() }))
      .max(MAX_COMP_AUGMENTS),
  ),
});
export type CompAugments = z.infer<typeof CompAugmentsSchema>;

/** Item stats from tactics.tools (see scripts/fetch-tactics-items.ts). */
export const ItemStatsSchema = z.object({
  source: z.string().url(),
  statsUpdated: z.string(),
  fetchedAt: z.string(),
  /** Artifact or emblem id -> units it lifts most; `delta` is the change in average placement (negative is better). */
  holders: z.record(z.string(), z.array(z.object({ unit: Id, delta: z.number().max(0) }))),
  /** Unit id -> its most-built completed items. */
  topItems: z.record(z.string(), z.array(Id)),
});
export type ItemStats = z.infer<typeof ItemStatsSchema>;

export interface SnapshotItem {
  id: string;
  name: string;
  kind: "item" | "emblem";
  components: [string, string];
  icon: string;
}
/** An artifact or emblem that can be held but has no recipe. */
export interface SnapshotUncraftable {
  id: string;
  name: string;
  kind: "artifact" | "emblem";
  icon: string;
}
export interface SnapshotUnit {
  id: string;
  name: string;
  cost: number;
  traits: string[];
  icon: string;
}
export interface SnapshotTrait {
  id: string;
  name: string;
  icon: string;
  /** Unit counts at which the trait activates a new tier, ascending. */
  breakpoints: number[];
}
export interface Snapshot {
  set: number;
  source: string;
  fetchedAt: string;
  components: { id: string; name: string; icon: string }[];
  items: SnapshotItem[];
  uncraftables: SnapshotUncraftable[];
  units: SnapshotUnit[];
  traits: SnapshotTrait[];
  augments: { id: string; name: string; icon: string }[];
}
