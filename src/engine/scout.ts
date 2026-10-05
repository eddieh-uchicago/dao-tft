import type { Comp } from "@/data/schema";
import type { CarrySwap, Recommendation, ScoutState, UnitId } from "./types";

const CARRY_PENALTY = 0.1;
const FRONTLINE_PENALTY = 0.03;
const FRONTLINE_PENALTY_CAP = 0.12;
/** More than this many opponents on a unit stops making it any worse. */
const CONTEST_CAP = 3;

function contest(scout: ScoutState, unit: UnitId): number {
  return Math.min(CONTEST_CAP, scout.contested[unit] ?? 0);
}

/** Every unit on an opponent's comp counts as contested once per opponent playing it. */
export function scoutFromOpponents(opponents: (Comp | undefined)[]): ScoutState {
  const contested: Record<UnitId, number> = {};
  for (const comp of opponents) {
    if (!comp) continue;
    for (const unit of new Set([...comp.carries, ...comp.frontline, ...comp.endBoard])) {
      contested[unit] = (contested[unit] ?? 0) + 1;
    }
  }
  return { contested };
}

/** How much to subtract from a comp's score because opponents are playing its units. */
export function scoutPenalty(comp: Comp, scout: ScoutState): number {
  const carry = Math.max(0, ...comp.carries.map((u) => contest(scout, u)));
  const front = comp.frontline.reduce((sum, u) => sum + contest(scout, u), 0);
  return CARRY_PENALTY * carry + Math.min(FRONTLINE_PENALTY_CAP, FRONTLINE_PENALTY * front);
}

/** Frontline swaps the comp's author approved that nobody else is holding. */
export function openFrontline(comp: Comp, scout: ScoutState): UnitId[] {
  return comp.frontlineAlternatives.filter((u) => !scout.contested[u]);
}

/**
 * Other comps with an uncontested carry that want some of the same completed
 * items, so the player's current components still pay off after a pivot.
 */
export function carrySwaps(from: Comp, ranking: Recommendation[], scout: ScoutState, limit = 3): CarrySwap[] {
  const wanted = new Set(from.targetItems.map((t) => t.item));
  return ranking
    .filter((r) => r.comp.slug !== from.slug && r.comp.carries.every((u) => !scout.contested[u]))
    .map((r) => ({
      comp: r.comp,
      sharedItems: [...new Set(r.comp.targetItems.map((t) => t.item).filter((i) => wanted.has(i)))],
      score: r.score,
    }))
    .filter((s) => s.sharedItems.length > 0)
    .sort((a, b) => b.sharedItems.length - a.sharedItems.length || b.score - a.score)
    .slice(0, limit)
    .map(({ comp, sharedItems }) => ({ comp, sharedItems }));
}
