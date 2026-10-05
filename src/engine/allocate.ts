import type { Allocation, BuiltItem, ComponentBag, PendingItem, TargetEntry } from "./types";

/** Share of an item's weight earned by holding one of its two components. */
export const PARTIAL_CREDIT = 0.35;

/**
 * Chooses which target items to craft from the player's components.
 *
 * Every completed item consumes two components, so the targets compete for the
 * same pool. This is a subset search: for each target either craft it (if the
 * remaining pool covers its recipe) or skip it. Infeasible branches are cut
 * immediately, and a bag holds at most ~12 components, so only a few items can
 * ever be crafted and the search stays tiny. Each complete choice is scored as
 *
 *   crafted weight + PARTIAL_CREDIT * weight of every unbuilt item that a
 *   leftover component still contributes to
 *
 * and the best-scoring choice wins. Ties go to the earlier targets, which
 * authors list in priority order.
 */
export function allocate(targets: TargetEntry[], bag: ComponentBag): Allocation {
  const pool: ComponentBag = { ...bag };
  const chosen: number[] = [];
  const best = { picks: [] as number[], value: -1 };

  const search = (i: number, craftedWeight: number): void => {
    if (i === targets.length) {
      const value = craftedWeight + partialCredit(targets, chosen, pool).credit;
      if (value > best.value) {
        best.value = value;
        best.picks = [...chosen];
      }
      return;
    }
    const t = targets[i];
    const [a, b] = t.components;
    pool[a] = (pool[a] ?? 0) - 1;
    pool[b] = (pool[b] ?? 0) - 1;
    if (pool[a] >= 0 && pool[b] >= 0) {
      chosen.push(i);
      search(i + 1, craftedWeight + t.weight);
      chosen.pop();
    }
    pool[a] += 1;
    pool[b] += 1;
    search(i + 1, craftedWeight);
  };
  search(0, 0);

  return materialize(targets, bag, best.picks);
}

/** Greedy by weight: each unbuilt item can claim at most one leftover component. */
function partialCredit(
  targets: TargetEntry[],
  built: number[],
  pool: ComponentBag,
): { credit: number; claims: Map<number, string> } {
  const builtSet = new Set(built);
  const spare = { ...pool };
  const claims = new Map<number, string>();
  let credit = 0;
  const order = targets.map((_, i) => i).filter((i) => !builtSet.has(i)).sort((x, y) => targets[y].weight - targets[x].weight);
  for (const i of order) {
    for (const c of targets[i].components) {
      if ((spare[c] ?? 0) > 0) {
        spare[c] -= 1;
        claims.set(i, c);
        credit += PARTIAL_CREDIT * targets[i].weight;
        break;
      }
    }
  }
  return { credit, claims };
}

function materialize(targets: TargetEntry[], bag: ComponentBag, picks: number[]): Allocation {
  const leftover: ComponentBag = { ...bag };
  const built: BuiltItem[] = picks.map((i) => {
    const t = targets[i];
    for (const c of t.components) leftover[c] -= 1;
    return { ...t, uses: t.components };
  });
  const { credit, claims } = partialCredit(targets, picks, leftover);
  const pickSet = new Set(picks);
  const pending: PendingItem[] = targets
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => !pickSet.has(i))
    .map(({ t, i }) => {
      const have = claims.has(i) ? [claims.get(i)!] : [];
      const need = [...t.components];
      if (have.length) need.splice(need.indexOf(have[0]), 1);
      return { ...t, have, need };
    })
    .sort((x, y) => y.have.length - x.have.length || y.weight - x.weight);

  return {
    built,
    pending,
    leftover,
    value: built.reduce((sum, b) => sum + b.weight, 0) + credit,
  };
}

/**
 * Matches completed items the player already holds to targets, highest weight
 * first. Claimed targets count as built and need no components.
 */
export function claimHeld(
  targets: TargetEntry[],
  held: string[],
): { claimed: BuiltItem[]; rest: TargetEntry[]; spare: string[] } {
  const spare = [...held];
  const taken = new Set<number>();
  const order = targets.map((_, i) => i).sort((x, y) => targets[y].weight - targets[x].weight);
  for (const i of order) {
    const k = spare.indexOf(targets[i].item);
    if (k >= 0) {
      spare.splice(k, 1);
      taken.add(i);
    }
  }
  return {
    claimed: targets.filter((_, i) => taken.has(i)).map((t) => ({ ...t, uses: [], held: true })),
    rest: targets.filter((_, i) => !taken.has(i)),
    /** Held items no target claimed. */
    spare,
  };
}

/** Highest value any comp with these weights could reach from `n` components. */
export function optimisticBound(weights: number[], n: number): number {
  const sorted = [...weights].sort((a, b) => b - a);
  const whole = Math.floor(n / 2);
  let bound = sorted.slice(0, whole).reduce((s, w) => s + w, 0);
  if (n % 2 === 1 && sorted[whole] !== undefined) bound += PARTIAL_CREDIT * sorted[whole];
  return bound;
}
