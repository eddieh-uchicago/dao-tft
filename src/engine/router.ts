import type { Comp, Tier } from "@/data/schema";
import { allocate, claimHeld, optimisticBound } from "./allocate";
import { augmentEffect, tagRecommendations } from "./augments";
import { Catalog, bagSize, withComponent } from "./catalog";
import { scoutPenalty } from "./scout";
import type {
  Allocation,
  AugmentId,
  AugmentOutcome,
  ComponentBag,
  Fit,
  GameState,
  HitTarget,
  Recommendation,
  TargetEntry,
} from "./types";

export const TIER_WEIGHT: Record<Tier, number> = { S: 1, A: 0.85, B: 0.7, C: 0.5 };

const FIT_BANDS: [number, Fit][] = [
  [0.85, "S"],
  [0.65, "A"],
  [0.45, "B"],
  [0.25, "C"],
];

export function fitFor(score: number): Fit {
  return FIT_BANDS.find(([min]) => score >= min)?.[1] ?? "D";
}

/** Most a perfectly matching board can add to a comp's score. */
export const BOARD_WEIGHT = 0.15;
/** Credit for a board unit that is not in the comp but shares a trait with its end board. */
const TRAIT_MATCH = 0.5;

const bagKey = (bag: ComponentBag) =>
  Object.keys(bag)
    .filter((k) => bag[k] > 0)
    .sort()
    .map((k) => `${k}:${bag[k]}`)
    .join(",");

/** Ranks curated comps against what the player is holding right now. */
export class TftEngine {
  private readonly targets = new Map<string, TargetEntry[]>();
  private readonly allocations = new Map<string, Allocation>();

  constructor(
    readonly catalog: Catalog,
    readonly comps: Comp[],
  ) {
    for (const comp of comps) {
      this.targets.set(
        comp.slug,
        comp.targetItems.map((t) => ({
          item: t.item,
          unit: t.unit,
          weight: t.weight,
          components: catalog.item(t.item).components,
        })),
      );
    }
  }

  /** All comps, best first. Augments in `state` re-rank and tag the result. */
  rank(state: GameState): Recommendation[] {
    const baseline = this.rankWith(state, []);
    if (!state.augments.length) return baseline;
    const ranking = this.rankWith(state, state.augments);
    tagRecommendations(ranking, baseline);
    return ranking;
  }

  /**
   * For one comp: which component, hit next (carousel, creep round), moves its
   * items furthest, and what it completes or builds toward. Best first.
   */
  hitNext(comp: Comp, state: GameState): HitTarget[] {
    const before = this.allocationWithHeld(comp, state.components, state.items);
    const had = new Set(before.built.map((b) => b.item));
    return this.catalog.componentIds
      .map((component): HitTarget => {
        const after = this.allocationWithHeld(comp, withComponent(state.components, component), state.items);
        return {
          component,
          gain: after.value - before.value,
          unlocks: after.built.map((b) => b.item).filter((i) => !had.has(i)),
          toward: before.pending.find((p) => p.need.includes(component))?.item,
        };
      })
      .filter((t) => t.gain > 0)
      .sort((a, b) => b.gain - a.gain || b.unlocks.length - a.unlocks.length);
  }

  /** Re-rank as if each offered augment were picked. */
  adviseAugments(state: GameState, offers: AugmentId[]): AugmentOutcome[] {
    const current = this.rank(state)[0]?.comp.slug;
    return offers.map((augment) => {
      const ranking = this.rank({ ...state, augments: [...state.augments, augment] });
      return { augment, ranking, topChanged: ranking[0]?.comp.slug !== current };
    });
  }

  private rankWith(state: GameState, augments: AugmentId[]): Recommendation[] {
    return this.comps
      .map((comp) => this.evaluate(comp, state, augments))
      .sort(
        (a, b) =>
          b.score - a.score || TIER_WEIGHT[b.tier] - TIER_WEIGHT[a.tier] || a.comp.slug.localeCompare(b.comp.slug),
      );
  }

  private evaluate(comp: Comp, state: GameState, augments: AugmentId[]): Recommendation {
    const allocation = this.allocationWithHeld(comp, state.components, state.items);
    const { claimed, rest } = claimHeld(this.targets.get(comp.slug)!, state.items);
    const heldWeight = claimed.reduce((sum, b) => sum + b.weight, 0);
    const bound =
      heldWeight +
      optimisticBound(
        rest.map((t) => t.weight),
        bagSize(state.components),
      );
    const coverage = bound > 0 ? Math.min(1, allocation.value / bound) : 0;
    const { bonus, notes } = augmentEffect(comp, augments);
    const penalty = scoutPenalty(comp, state.scout);
    const { fit: boardFit, matches } = this.boardFit(comp, state.board);
    const boardBonus = BOARD_WEIGHT * boardFit;
    const score = coverage * TIER_WEIGHT[comp.tier] + bonus + boardBonus - penalty;
    return {
      comp,
      tier: comp.tier,
      score,
      fit: fitFor(score),
      coverage,
      allocation,
      augmentBonus: bonus,
      augmentNotes: notes,
      scoutPenalty: penalty,
      boardMatches: matches,
      boardBonus,
      tags: [],
    };
  }

  /** Average credit per board unit: 1 if it is in the comp's opener or end board, 0.5 if it shares a trait. */
  private boardFit(comp: Comp, board: string[]): { fit: number; matches: string[] } {
    if (!board.length) return { fit: 0, matches: [] };
    const inComp = new Set([...comp.endBoard, ...comp.opener.units]);
    const compTraits = new Set(comp.endBoard.flatMap((u) => this.catalog.traitsOf(u)));
    const matches: string[] = [];
    let total = 0;
    for (const unit of board) {
      if (inComp.has(unit)) {
        matches.push(unit);
        total += 1;
      } else if (this.catalog.traitsOf(unit).some((t) => compTraits.has(t))) {
        total += TRAIT_MATCH;
      }
    }
    return { fit: total / board.length, matches };
  }

  /** Held items claim their targets first; components craft the rest. */
  private allocationWithHeld(comp: Comp, bag: ComponentBag, held: string[]): Allocation {
    const { claimed, rest } = claimHeld(this.targets.get(comp.slug)!, held);
    const heldWeight = claimed.reduce((sum, b) => sum + b.weight, 0);
    const crafted = this.allocationFor(comp.slug, rest, bag, held);
    return { ...crafted, built: [...claimed, ...crafted.built], value: crafted.value + heldWeight };
  }

  private allocationFor(slug: string, targets: TargetEntry[], bag: ComponentBag, held: string[]): Allocation {
    const key = `${slug}|${bagKey(bag)}|${[...held].sort().join(",")}`;
    let result = this.allocations.get(key);
    if (!result) {
      result = allocate(targets, bag);
      this.allocations.set(key, result);
    }
    return result;
  }
}
