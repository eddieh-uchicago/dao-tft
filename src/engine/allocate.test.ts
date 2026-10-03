import { describe, expect, it } from "vitest";
import { PARTIAL_CREDIT, allocate, optimisticBound } from "./allocate";
import { ITEM, catalog } from "./fixtures";
import type { ComponentBag, TargetEntry } from "./types";

const target = (item: string, weight: number): TargetEntry => ({
  item,
  unit: "u",
  weight,
  components: catalog.item(item).components,
});

describe("allocate", () => {
  it("picks the highest-weight set of items the components can actually build", () => {
    // BF x2, Gloves, Cloak -> Infinity Edge (BF+Gloves) and Bloodthirster (BF+Cloak).
    // Deathblade (BF+BF) is feasible alone but would strand the Gloves and Cloak.
    const targets = [target(ITEM.deathblade, 1), target(ITEM.infinityEdge, 3), target(ITEM.bloodthirster, 2)];
    const bag: ComponentBag = { BFSword: 2, SparringGloves: 1, NegatronCloak: 1 };
    const result = allocate(targets, bag);
    expect(result.built.map((b) => b.item).sort()).toEqual([ITEM.bloodthirster, ITEM.infinityEdge].sort());
    expect(result.value).toBe(5);
    expect(result.leftover.BFSword).toBe(0);
  });

  it("does not spend one component on two items", () => {
    // One Rod cannot be both halves of Rabadon's and Archangel's.
    const targets = [target(ITEM.rabadons, 3), target(ITEM.archangels, 3)];
    const result = allocate(targets, { NeedlesslyLargeRod: 2, TearOfTheGoddess: 1 });
    expect(result.built).toHaveLength(1);
    expect(result.leftover.NeedlesslyLargeRod! + result.leftover.TearOfTheGoddess!).toBe(1);
  });

  it("gives partial credit and reports what is still missing", () => {
    const result = allocate([target(ITEM.blueBuff, 3)], { TearOfTheGoddess: 1 });
    expect(result.built).toHaveLength(0);
    expect(result.value).toBeCloseTo(PARTIAL_CREDIT * 3);
    expect(result.pending[0]).toMatchObject({ item: ITEM.blueBuff, have: ["TearOfTheGoddess"], need: ["TearOfTheGoddess"] });
  });

  it("lists unreachable items with both components still needed", () => {
    const result = allocate([target(ITEM.warmogs, 3)], { BFSword: 1 });
    expect(result.value).toBe(0);
    expect(result.pending[0]).toMatchObject({ have: [], need: ["GiantsBelt", "GiantsBelt"] });
  });

  it("handles an empty bag", () => {
    const result = allocate([target(ITEM.warmogs, 3)], {});
    expect(result.built).toEqual([]);
    expect(result.value).toBe(0);
  });
});

describe("allocate properties", () => {
  // Small deterministic PRNG so failures reproduce.
  const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const itemIds = catalog.snapshot.items.filter((i) => i.kind === "item").map((i) => i.id);

  function randomCase(rand: () => number) {
    const targets = Array.from({ length: 2 + Math.floor(rand() * 8) }, () =>
      target(itemIds[Math.floor(rand() * itemIds.length)], 1 + Math.floor(rand() * 3)),
    );
    const bag: ComponentBag = {};
    for (let i = 0; i < Math.floor(rand() * 9); i++) {
      const c = catalog.componentIds[Math.floor(rand() * catalog.componentIds.length)];
      bag[c] = (bag[c] ?? 0) + 1;
    }
    return { targets, bag };
  }

  it("never uses more components than the player holds", () => {
    const rand = rng(42);
    for (let n = 0; n < 200; n++) {
      const { targets, bag } = randomCase(rand);
      const result = allocate(targets, bag);
      const used: ComponentBag = {};
      for (const b of result.built) for (const c of b.uses) used[c] = (used[c] ?? 0) + 1;
      for (const c of Object.keys(used)) expect(used[c]).toBeLessThanOrEqual(bag[c] ?? 0);
      for (const c of Object.keys(result.leftover)) expect(result.leftover[c]).toBeGreaterThanOrEqual(0);
    }
  });

  it("never gets worse when a component is added", () => {
    const rand = rng(7);
    for (let n = 0; n < 200; n++) {
      const { targets, bag } = randomCase(rand);
      const extra = catalog.componentIds[Math.floor(rand() * catalog.componentIds.length)];
      const before = allocate(targets, bag).value;
      const after = allocate(targets, { ...bag, [extra]: (bag[extra] ?? 0) + 1 }).value;
      expect(after).toBeGreaterThanOrEqual(before - 1e-9);
    }
  });

  it("never exceeds the optimistic bound", () => {
    const rand = rng(99);
    for (let n = 0; n < 200; n++) {
      const { targets, bag } = randomCase(rand);
      const size = Object.values(bag).reduce((s, v) => s + v, 0);
      const value = allocate(targets, bag).value;
      expect(value).toBeLessThanOrEqual(optimisticBound(targets.map((t) => t.weight), size) + 1e-9);
    }
  });
});
