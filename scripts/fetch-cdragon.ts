/**
 * Pulls TFT Set 18 metadata from Community Dragon and writes a small, committed
 * snapshot to src/data/snapshot.json. Comp JSON is validated against this
 * snapshot (see src/data/validate.test.ts), so a patch that renames or removes a
 * unit/item fails CI instead of silently shipping stale comps.
 *
 * Usage: npm run fetch-data
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SET_KEY = "18";
const SOURCE = "https://raw.communitydragon.org/latest/cdragon/tft/en_us.json";
const ASSET_BASE = "https://raw.communitydragon.org/latest/game/";

interface RawChampion {
  apiName: string;
  name: string;
  cost: number;
  traits?: string[];
  squareIcon?: string;
  tileIcon?: string;
}
interface RawTrait {
  apiName: string;
  name: string;
  icon: string;
}
interface RawItem {
  apiName: string;
  name: string;
  icon: string;
  isAugment?: boolean;
  composition?: string[];
}
interface RawData {
  items: RawItem[];
  sets: Record<string, { champions: RawChampion[]; traits: RawTrait[] }>;
}

const COMPONENT_PREFIX = "DA_Component_";
// Set 18 reuses the old Tactician items; they are never part of a comp plan.
const EXCLUDED_ITEMS = new Set(["DA_TacticiansCape", "DA_TacticiansCrown", "DA_TacticiansShield"]);
// Lux is a 5-cost with one variant per trait; keep only the base entry.
const LUX_VARIANT = /^DA_(18_Lux_|Lux18_(Blackthorn|Blossom))/;

function iconUrl(path: string | undefined): string {
  if (!path) return "";
  return ASSET_BASE + path.toLowerCase().replace(/\.tex$/, ".png");
}

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Community Dragon returned ${res.status}`);
  const raw = (await res.json()) as RawData;
  const set = raw.sets[SET_KEY];
  if (!set) throw new Error(`Set ${SET_KEY} not found in Community Dragon data`);

  const components = raw.items
    .filter((i) => i.apiName.startsWith(COMPONENT_PREFIX))
    .map((i) => ({
      id: i.apiName.slice(COMPONENT_PREFIX.length),
      name: i.name,
      icon: iconUrl(i.icon),
    }));
  const componentIds = new Set(components.map((c) => c.id));

  const items = raw.items
    .filter(
      (i) =>
        !i.isAugment &&
        !EXCLUDED_ITEMS.has(i.apiName) &&
        i.composition?.length === 2 &&
        i.composition.every((c) => c.startsWith(COMPONENT_PREFIX) && componentIds.has(c.slice(COMPONENT_PREFIX.length))),
    )
    .map((i) => ({
      id: i.apiName,
      name: i.name,
      kind: i.apiName.startsWith("DA_18_Emblem") ? ("emblem" as const) : ("item" as const),
      components: i.composition!.map((c) => c.slice(COMPONENT_PREFIX.length)).sort() as [string, string],
      icon: iconUrl(i.icon),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const traits = set.traits.map((t) => ({ id: t.apiName, name: t.name, icon: iconUrl(t.icon) }));
  const traitNames = new Set(traits.map((t) => t.name));

  const units = set.champions
    .filter((c) => c.apiName.startsWith("DA_") && c.cost >= 1 && c.cost <= 5 && (c.traits?.length ?? 0) > 0)
    .filter((c) => !LUX_VARIANT.test(c.apiName))
    .map((c) => ({
      id: c.apiName,
      name: c.name,
      cost: c.cost,
      traits: (c.traits ?? []).filter((t) => traitNames.has(t)),
      icon: iconUrl(c.squareIcon ?? c.tileIcon),
    }))
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  const augments = raw.items
    .filter((i) => i.isAugment && i.apiName.startsWith("DA_18_"))
    .map((i) => ({ id: i.apiName, name: i.name, icon: iconUrl(i.icon) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!components.length || !items.length || !units.length) {
    throw new Error("Extraction produced an empty section; Community Dragon format may have changed");
  }

  const snapshot = {
    set: Number(SET_KEY),
    source: SOURCE,
    fetchedAt: new Date().toISOString().slice(0, 10),
    components,
    items,
    units,
    traits,
    augments,
  };
  const out = resolve(__dirname, "../src/data/snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(
    `Wrote ${out}: ${components.length} components, ${items.length} items, ${units.length} units, ${traits.length} traits, ${augments.length} augments`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
