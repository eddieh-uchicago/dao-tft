import { Catalog } from "@/engine/catalog";
import { TftEngine } from "@/engine/router";
import augments21Json from "./augments-2-1.json";
import { CompSchema, StageAugmentsSchema, type Comp, type Snapshot } from "./schema";
import snapshotJson from "./snapshot.json";
import { validateComps } from "./validate";

import apheliosFlex from "./comps/aphelios-flex.json";
import asheFast9 from "./comps/ashe-fast-9.json";
import azirRammusReroll from "./comps/azir-rammus-reroll.json";
import caitlynReroll from "./comps/caitlyn-reroll.json";
import defenderCassiopeia from "./comps/defender-cassiopeia.json";
import dravenFast9 from "./comps/draven-fast-9.json";
import floraMalphite from "./comps/flora-malphite.json";
import invokerMorganaAhri from "./comps/invoker-morgana-ahri.json";
import khazixReroll from "./comps/khazix-reroll.json";
import primalMalphite from "./comps/primal-malphite.json";
import riftbeastReroll from "./comps/riftbeast-reroll.json";
import veigarReroll from "./comps/veigar-reroll.json";

export const snapshot = snapshotJson as Snapshot;
export const catalog = new Catalog(snapshot);

// Parsing here means a malformed comp fails `next build` instead of reaching a player.
const raw: unknown[] = [
  apheliosFlex,
  asheFast9,
  azirRammusReroll,
  caitlynReroll,
  defenderCassiopeia,
  dravenFast9,
  floraMalphite,
  invokerMorganaAhri,
  khazixReroll,
  primalMalphite,
  riftbeastReroll,
  veigarReroll,
];
export const comps: Comp[] = raw.map((c) => CompSchema.parse(c));

const problems = validateComps(comps, catalog);
if (problems.length) throw new Error(`Invalid comp data:\n${problems.join("\n")}`);

export const augments21 = StageAugmentsSchema.parse(augments21Json);
const unknownAugments = augments21.augments.filter((a) => !catalog.hasAugment(a.id)).map((a) => a.id);
if (unknownAugments.length) throw new Error(`Unknown 2-1 augments: ${unknownAugments.join(", ")}`);

export const engine = new TftEngine(catalog, comps);

export const compBySlug = (slug: string) => comps.find((c) => c.slug === slug);
