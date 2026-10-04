import type { Comp, Tier } from "@/data/schema";
import { allocate, optimisticBound } from "./allocate";
import { augmentEffect, tagRecommendations } from "./augments";
import { Catalog, bagSize, withComponent } from "./catalog";
import { scoutPenalty } from "./scout";
import type {
  Allocation,
  AugmentId,
  AugmentOutcome,
  CarouselTarget,
  ComponentBag,
  Fit,
  GameState,
  Recommendation,
  SlamSuggestion,
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

  /** Completed items worth crafting now, weighted by how well the top comps fit. */
  slamNow(ranking: Recommendation[], topN = 3, limit = 3): SlamSuggestion[] {
    const byItem = new Map<string, SlamSuggestion & { total: number }>();
    for (const rec of ranking.slice(0, topN)) {
      for (const b of rec.allocation.built) {
        const entry = byItem.get(b.item) ?? { item: b.item, unit: b.unit, comps: [], uses: b.uses, weight: 0, total: 0 };
        entry.comps.push(rec.comp.slug);
        entry.weight = Math.max(entry.weight, b.weight);
        entry.total += b.weight * rec.score;
        byItem.set(b.item, entry);
      }
    }
    return [...byItem.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((s) => ({ item: s.item, unit: s.unit, comps: s.comps, uses: s.uses, weight: s.weight }));
  }

  /** For each component: what would hitting it next (carousel, creep round) do? */
  carouselTargets(state: GameState): CarouselTarget[] {
    const before = this.rank(state);
    const beforeBy = new Map(before.map((r) => [r.comp.slug, r]));
    const topBefore = new Set(before.slice(0, 3).map((r) => r.comp.slug));

    return this.catalog.componentIds
      .map((component): CarouselTarget => {
        const after = this.rank({ ...state, components: withComponent(state.components, component) });
        // Absolute progress, not the normalised score: a lone component can already
        // "fully" fit a comp, yet the next one may complete an item.
        let gain = 0;
        let best = after[0];
        for (const rec of after) {
          const delta =
            (rec.allocation.value - beforeBy.get(rec.comp.slug)!.allocation.value) * TIER_WEIGHT[rec.tier];
          if (delta > gain) {
            gain = delta;
            best = rec;
          }
        }
        const had = new Set(beforeBy.get(best.comp.slug)!.allocation.built.map((b) => b.item));
        return {
          component,
          gain,
          bestComp: best.comp.slug,
          unlocks: best.allocation.built.map((b) => b.item).filter((i) => !had.has(i)),
          entersTop3: after
            .slice(0, 3)
            .map((r) => r.comp.slug)
            .filter((s) => !topBefore.has(s)),
        };
      })
      .filter((t) => t.gain > 0)
      .sort((a, b) => b.gain - a.gain);
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
    const targets = this.targets.get(comp.slug)!;
    const n = bagSize(state.components);
    const allocation = this.allocationFor(comp.slug, targets, state.components);
    const bound = optimisticBound(
      targets.map((t) => t.weight),
      n,
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

  private allocationFor(slug: string, targets: TargetEntry[], bag: ComponentBag): Allocation {
    const key = `${slug}|${bagKey(bag)}`;
    let result = this.allocations.get(key);
    if (!result) {
      result = allocate(targets, bag);
      this.allocations.set(key, result);
    }
    return result;
  }
}
