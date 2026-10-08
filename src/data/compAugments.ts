import type { Catalog } from "@/engine/catalog";
import { AUGMENT_STRENGTH_BONUS, type AugmentStrength, type Comp, type CompAugments } from "./schema";

const DEFAULT_NOTE: Record<AugmentStrength, string> = {
  core: "{name} is a core augment for this comp.",
  strong: "{name} is a strong augment for this comp.",
  good: "{name} is a good augment for this comp.",
  avoid: "{name} works against this comp.",
};

/**
 * Gives each comp the augment modifiers listed for it in comp-augments.json.
 * Returns every problem found; the comps are only usable when there are none.
 */
export function applyCompAugments(
  comps: Comp[],
  file: CompAugments,
  catalog: Catalog,
  /** Comps whose source file set augmentModifiers itself, which the shared file replaces. */
  ownLists: string[] = [],
): { comps: Comp[]; problems: string[] } {
  const problems = ownLists.map(
    (slug) => `${slug}: augmentModifiers belong in src/data/comp-augments.json, not the comp file`,
  );
  const slugs = new Set(comps.map((c) => c.slug));
  for (const slug of Object.keys(file.comps)) {
    if (!slugs.has(slug)) problems.push(`comp-augments.json: no comp has the slug "${slug}"`);
  }

  const merged = comps.map((comp) => {
    const entries = file.comps[comp.slug] ?? [];
    const seen = new Set<string>();
    for (const { augment } of entries) {
      if (!catalog.hasAugment(augment)) problems.push(`comp-augments.json ${comp.slug}: unknown augment "${augment}"`);
      if (seen.has(augment)) problems.push(`comp-augments.json ${comp.slug}: "${augment}" is listed twice`);
      seen.add(augment);
    }
    const augmentModifiers = entries.map(({ augment, strength, note }) => ({
      augment,
      bonus: AUGMENT_STRENGTH_BONUS[strength],
      note: note ?? DEFAULT_NOTE[strength].replace("{name}", catalog.augmentName(augment)),
    }));
    return { ...comp, augmentModifiers };
  });
  return { comps: merged, problems };
}
