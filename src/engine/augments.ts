import type { Comp } from "@/data/schema";
import type { AugmentId, Recommendation } from "./types";

/** An augment must add at least this much to a comp to count as a lock-in. */
const LOCK_IN_BONUS = 0.1;
/** ...and the comp must lead the runner-up by at least this much. */
const LOCK_IN_LEAD = 0.15;
/** A flex enabler needs at least a strong pick; generic augments many comps list should not tag one. */
const FLEX_ENABLER_BONUS = 0.2;
/** Most all of a player's augments can add to one comp, so augments steer the ranking without drowning out items. */
export const AUGMENT_CAP = 0.5;

export function augmentEffect(comp: Comp, selected: AugmentId[]): { bonus: number; notes: string[] } {
  let bonus = 0;
  const notes: string[] = [];
  for (const mod of comp.augmentModifiers) {
    if (selected.includes(mod.augment)) {
      bonus += mod.bonus;
      notes.push(mod.note);
    }
  }
  return { bonus: Math.min(bonus, AUGMENT_CAP), notes };
}

/**
 * Marks recommendations that the chosen augments changed in a way worth acting on.
 * `withAugments` and `baseline` are the same comps ranked with and without them.
 *
 * - lock-in: the top comp is boosted by an augment and clearly ahead, so stop flexing.
 * - flex-enabler: a strong augment lifted a comp from outside the top 3 into it.
 */
export function tagRecommendations(withAugments: Recommendation[], baseline: Recommendation[]): void {
  const baseRank = new Map(baseline.map((r, i) => [r.comp.slug, i]));
  withAugments.forEach((rec, i) => {
    if (rec.augmentBonus <= 0) return;
    if (i === 0 && rec.augmentBonus >= LOCK_IN_BONUS && rec.score - (withAugments[1]?.score ?? 0) >= LOCK_IN_LEAD) {
      rec.tags.push("lock-in");
    } else if (i < 3 && rec.augmentBonus >= FLEX_ENABLER_BONUS && (baseRank.get(rec.comp.slug) ?? Infinity) >= 3) {
      rec.tags.push("flex-enabler");
    }
  });
}
