import type { Comp, ItemStats } from "@/data/schema";
import type { Catalog } from "./catalog";
import type { ItemId } from "./types";

/** A guide builds this artifact or emblem in the comp. */
const KEY_ITEM_BONUS = 0.2;
/**
 * tactics.tools placement gain -> score, for a comp carry and for any other
 * end-board unit. Dawncore lifts Veigar by 0.51 placements, so it is worth ~0.3.
 */
const CARRY_HOLDER_SCALE = 0.6;
const BOARD_HOLDER_SCALE = 0.3;
/** An emblem for a trait the end board already runs this many units of. */
const EMBLEM_TRAIT_UNITS = 2;
const EMBLEM_TRAIT_BONUS = 0.08;
/** A completed item the comp does not list, but one of its carries commonly builds. */
const TOP_ITEM_BONUS = 0.05;
/** Further reasons for the same item count at this fraction of their value. */
const EXTRA_REASON = 0.5;
/** One item can only push so far, and so can a bench full of them. */
const PER_ITEM_CAP = 0.4;
const TOTAL_CAP = 0.45;

export const NO_ITEM_STATS: ItemStats = {
  source: "https://tactics.tools/items",
  statsUpdated: "",
  fetchedAt: "",
  holders: {},
  topItems: {},
};

const round = (n: number) => n.toFixed(2);

/**
 * How much the held items a comp does not already build (`spare`) pull the
 * player toward it. Artifacts and emblems are the strong signal. An item's
 * best reason counts in full and agreeing reasons add a little more, so a guide
 * pick that is also the unit's best holder outranks either one alone.
 */
export function heldItemEffect(
  comp: Comp,
  spare: ItemId[],
  catalog: Catalog,
  stats: ItemStats,
): { bonus: number; notes: string[] } {
  let bonus = 0;
  const notes: string[] = [];
  for (const id of new Set(spare)) {
    const item = catalog.holdable(id);
    if (!item) continue;
    // Best value per reason kind, so one unit's several stats do not stack.
    const reasons = new Map<string, { value: number; note: string }>();
    const consider = (kind: string, value: number, note: string) => {
      if (value > (reasons.get(kind)?.value ?? 0)) reasons.set(kind, { value, note });
    };

    const key = comp.keyItems.find((k) => k.item === id);
    if (key) {
      consider("guide", KEY_ITEM_BONUS, `TFT Academy builds ${item.name} on ${unitName(catalog, key.unit)} in this comp.`);
    }

    for (const { unit, delta } of stats.holders[id] ?? []) {
      const scale = comp.carries.includes(unit)
        ? CARRY_HOLDER_SCALE
        : comp.endBoard.includes(unit)
          ? BOARD_HOLDER_SCALE
          : 0;
      consider(
        "holder",
        -delta * scale,
        `${item.name} is a top pick for ${unitName(catalog, unit)} (${round(delta)} average placement on tactics.tools).`,
      );
    }

    if (item.kind === "emblem") {
      const trait = item.name.replace(/ Emblem$/, "");
      const count = comp.endBoard.filter((u) => catalog.traitsOf(u).includes(trait)).length;
      if (count >= EMBLEM_TRAIT_UNITS) {
        consider("trait", EMBLEM_TRAIT_BONUS, `${item.name} adds to this comp's ${count} ${trait} units.`);
      }
    }

    if (item.kind === "item") {
      const user = comp.carries.find((u) => stats.topItems[u]?.includes(id));
      if (user) consider("top", TOP_ITEM_BONUS, `${unitName(catalog, user)} often builds ${item.name}.`);
    }

    const ranked = [...reasons.values()].sort((a, b) => b.value - a.value);
    if (ranked.length) {
      const value = ranked[0].value + EXTRA_REASON * ranked.slice(1).reduce((sum, r) => sum + r.value, 0);
      bonus += Math.min(PER_ITEM_CAP, value);
      notes.push(...ranked.map((r) => r.note));
    }
  }
  return { bonus: Math.min(TOTAL_CAP, bonus), notes };
}

/**
 * Artifacts and emblems among `spare` that one of the comp's units would wear,
 * so they take one of that unit's item slots: the unit a guide puts it on, or
 * else the comp carry tactics.tools rates highest with it.
 */
export function slotFillers(
  comp: Comp,
  spare: ItemId[],
  catalog: Catalog,
  stats: ItemStats,
): { item: ItemId; unit: string }[] {
  return spare.flatMap((id) => {
    const kind = catalog.holdable(id)?.kind;
    if (kind !== "artifact" && kind !== "emblem") return [];
    const unit =
      comp.keyItems.find((k) => k.item === id)?.unit ??
      (stats.holders[id] ?? []).find((h) => comp.carries.includes(h.unit))?.unit;
    return unit ? [{ item: id, unit }] : [];
  });
}

function unitName(catalog: Catalog, id: string): string {
  return catalog.hasUnit(id) ? catalog.unit(id).name : id;
}
