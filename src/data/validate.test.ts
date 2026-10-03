import { describe, expect, it } from "vitest";
import { catalog, comps } from "./index";
import { CompSchema } from "./schema";
import { validateComps } from "./validate";

describe("curated comps", () => {
  it("are all consistent with the Community Dragon snapshot", () => {
    expect(validateComps(comps, catalog)).toEqual([]);
  });

  it("cover a spread of tiers", () => {
    const tiers = new Set(comps.map((c) => c.tier));
    expect(comps.length).toBeGreaterThanOrEqual(8);
    expect(tiers.has("S") || tiers.has("A")).toBe(true);
  });

  it("only use recipes that exist and weigh items 1 to 3", () => {
    for (const comp of comps) {
      for (const t of comp.targetItems) {
        expect(catalog.item(t.item).components).toHaveLength(2);
        expect(t.weight).toBeGreaterThanOrEqual(1);
        expect(t.weight).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("validateComps", () => {
  const good = comps[0];

  it("reports a unit or item that no longer exists after a patch", () => {
    const stale = {
      ...good,
      slug: "stale",
      carries: ["DA_Removed_Unit"],
      targetItems: [{ item: "DA_Removed_Item", unit: good.carries[0], weight: 3 }],
    };
    const problems = validateComps([stale], catalog);
    expect(problems).toContain('stale: unknown unit "DA_Removed_Unit" in carries');
    expect(problems).toContain('stale: unknown item "DA_Removed_Item" in targetItems');
  });

  it("reports an unknown augment", () => {
    const bad = { ...good, augmentModifiers: [{ augment: "DA_Nope", bonus: 0.1, note: "x" }] };
    expect(validateComps([bad], catalog).some((p) => p.includes('unknown augment "DA_Nope"'))).toBe(true);
  });

  it("reports duplicate slugs and carries missing from the board", () => {
    const problems = validateComps([good, { ...good, endBoard: [good.endBoard[1]] }], catalog);
    expect(problems.some((p) => p.includes("duplicate slug"))).toBe(true);
    expect(problems.some((p) => p.includes("is not on the end board"))).toBe(true);
  });
});

describe("CompSchema", () => {
  it("rejects more than five augment modifiers", () => {
    const mod = { augment: "DA_18_BigGrabBag", bonus: 0.1, note: "x" };
    expect(CompSchema.safeParse({ ...comps[0], augmentModifiers: Array(6).fill(mod) }).success).toBe(false);
  });

  it("rejects an item weight outside 1 to 3", () => {
    const bad = { ...comps[0], targetItems: [{ ...comps[0].targetItems[0], weight: 5 }] };
    expect(CompSchema.safeParse(bad).success).toBe(false);
  });
});
