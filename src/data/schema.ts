import { z } from "zod";

export const TIERS = ["S", "A", "B", "C"] as const;
export const TierSchema = z.enum(TIERS);
export type Tier = z.infer<typeof TierSchema>;

const Id = z.string().min(1);

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
  summary: z.string().min(1),
  playWhen: z.array(z.string().min(1)).min(1),
  carries: z.array(Id).min(1),
  frontline: z.array(Id),
  endBoard: z.array(Id).min(1),
  targetItems: z.array(TargetItemSchema).min(1).max(14),
  opener: z.object({ units: z.array(Id).min(1), note: z.string() }),
  slams: z.array(z.object({ item: Id, unit: Id, note: z.string() })),
  stages: z.object({ stage1: z.string(), stage2: z.string(), stage3: z.string() }),
  /** Capped at 5 per comp (PRD open question 2). */
  augmentModifiers: z
    .array(z.object({ augment: Id, bonus: z.number().min(-0.4).max(0.4), note: z.string() }))
    .max(5),
  frontlineAlternatives: z.array(Id),
});

export type TargetItem = z.infer<typeof TargetItemSchema>;
export type Comp = z.infer<typeof CompSchema>;

export interface SnapshotItem {
  id: string;
  name: string;
  kind: "item" | "emblem";
  components: [string, string];
  icon: string;
}
export interface SnapshotUnit {
  id: string;
  name: string;
  cost: number;
  traits: string[];
  icon: string;
}
export interface Snapshot {
  set: number;
  source: string;
  fetchedAt: string;
  components: { id: string; name: string; icon: string }[];
  items: SnapshotItem[];
  units: SnapshotUnit[];
  traits: { id: string; name: string; icon: string }[];
  augments: { id: string; name: string; icon: string }[];
}
