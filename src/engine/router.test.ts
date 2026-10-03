import { describe, expect, it } from "vitest";
import { ITEM, TEST_COMPS, emptyState, makeComp, testEngine } from "./fixtures";
import { carrySwaps, openFrontline, scoutPenalty } from "./scout";
import { fitFor } from "./router";

describe("rank", () => {
  it("puts the comp whose items the components build on top", () => {
    const engine = testEngine();
    const ap = engine.rank(emptyState({ NeedlesslyLargeRod: 2, TearOfTheGoddess: 2 }));
    expect(ap[0].comp.slug).toBe("ap-mage");
    expect(ap[0].allocation.built.map((b) => b.item)).toContain(ITEM.rabadons);

    const ad = engine.rank(emptyState({ BFSword: 1, SparringGloves: 1, RecurveBow: 1, NegatronCloak: 1 }));
    expect(ad[0].comp.slug).toBe("ad-sniper");
  });

  it("ranks every comp and orders them by score", () => {
    const ranking = testEngine().rank(emptyState({ GiantsBelt: 2, ChainVest: 1 }));
    expect(ranking).toHaveLength(TEST_COMPS.length);
    for (let i = 1; i < ranking.length; i++) expect(ranking[i - 1].score).toBeGreaterThanOrEqual(ranking[i].score);
    expect(ranking[0].comp.slug).toBe("tank-line");
  });

  it("lets a higher tier win when two comps match equally", () => {
    // Both want Bloodthirster as their only reachable item.
    const ranking = testEngine().rank(emptyState({ BFSword: 1, NegatronCloak: 1 }));
    const idx = (slug: string) => ranking.findIndex((r) => r.comp.slug === slug);
    expect(idx("ad-sniper")).toBeLessThan(idx("ad-bruiser"));
  });

  it("explains what is missing for comps it cannot finish", () => {
    const [top] = testEngine().rank(emptyState({ NeedlesslyLargeRod: 1 }));
    expect(top.comp.slug).toBe("ap-mage");
    expect(top.allocation.pending.some((p) => p.have.includes("NeedlesslyLargeRod"))).toBe(true);
  });

  it("maps scores to tier-style fit labels", () => {
    expect(fitFor(1)).toBe("S");
    expect(fitFor(0.7)).toBe("A");
    expect(fitFor(0.5)).toBe("B");
    expect(fitFor(0.3)).toBe("C");
    expect(fitFor(0.1)).toBe("D");
  });
});

describe("slamNow", () => {
  it("suggests items buildable now, strongest first", () => {
    const engine = testEngine();
    const ranking = engine.rank(emptyState({ NeedlesslyLargeRod: 2, TearOfTheGoddess: 1 }));
    const slams = engine.slamNow(ranking);
    expect(slams[0].item).toBe(ITEM.rabadons);
    expect(slams[0].comps).toContain("ap-mage");
  });

  it("suggests nothing when no item can be completed", () => {
    const engine = testEngine();
    expect(engine.slamNow(engine.rank(emptyState({ BFSword: 1 })))).toEqual([]);
  });
});

describe("carouselTargets", () => {
  it("shows which component completes an item, best first", () => {
    const engine = testEngine();
    const targets = engine.carouselTargets(emptyState({ BFSword: 1 }));
    expect(targets.length).toBeGreaterThan(0);
    const gloves = targets.find((t) => t.component === "SparringGloves");
    expect(gloves?.unlocks).toContain(ITEM.infinityEdge);
    for (let i = 1; i < targets.length; i++) expect(targets[i - 1].gain).toBeGreaterThanOrEqual(targets[i].gain);
  });

  it("only lists components that help", () => {
    const targets = testEngine().carouselTargets(emptyState({ BFSword: 1 }));
    expect(targets.every((t) => t.gain > 0)).toBe(true);
  });
});

describe("augments", () => {
  const withMods = () => {
    const comps = TEST_COMPS.map((c) =>
      c.slug === "tank-line"
        ? { ...c, augmentModifiers: [{ augment: "aug-tank", bonus: 0.3, note: "Loves tank items" }] }
        : c,
    );
    return testEngine(comps);
  };
  const state = emptyState({ BFSword: 1, SparringGloves: 1, NegatronCloak: 1, GiantsBelt: 1 });

  it("applies the modifier and records why", () => {
    const ranking = withMods().rank({ ...state, augments: ["aug-tank"] });
    const tank = ranking.find((r) => r.comp.slug === "tank-line")!;
    expect(tank.augmentBonus).toBeCloseTo(0.3);
    expect(tank.augmentNotes).toEqual(["Loves tank items"]);
  });

  it("flags a comp lifted into the top 3 as a flex enabler", () => {
    // The tank comp has nothing to build from these components, so it starts last.
    const engine = withMods();
    const bag = emptyState({ BFSword: 1, SparringGloves: 1, NeedlesslyLargeRod: 1, TearOfTheGoddess: 1 });
    expect(engine.rank(bag).findIndex((r) => r.comp.slug === "tank-line")).toBe(3);
    const ranking = engine.rank({ ...bag, augments: ["aug-tank"] });
    const tank = ranking.find((r) => r.comp.slug === "tank-line")!;
    expect(ranking.indexOf(tank)).toBeLessThan(3);
    expect(tank.tags).toContain("flex-enabler");
  });

  it("flags a clearly leading boosted comp as a lock-in", () => {
    const comps = TEST_COMPS.map((c) =>
      c.slug === "ad-sniper"
        ? { ...c, augmentModifiers: [{ augment: "aug-ad", bonus: 0.4, note: "AD all day" }] }
        : c,
    );
    const ranking = testEngine(comps).rank({ ...emptyState({ BFSword: 1, SparringGloves: 1 }), augments: ["aug-ad"] });
    expect(ranking[0].comp.slug).toBe("ad-sniper");
    expect(ranking[0].tags).toContain("lock-in");
  });

  it("tags nothing without augments", () => {
    expect(testEngine().rank(state).every((r) => r.tags.length === 0)).toBe(true);
  });

  it("previews each offered augment without changing the state", () => {
    const engine = withMods();
    const before = engine.rank(state)[0].comp.slug;
    const outcomes = engine.adviseAugments(state, ["aug-tank", "aug-unknown"]);
    expect(outcomes[0].topChanged).toBe(outcomes[0].ranking[0].comp.slug !== before);
    expect(outcomes[1].topChanged).toBe(false);
    expect(state.augments).toEqual([]);
  });
});

describe("scout", () => {
  const sniper = TEST_COMPS.find((c) => c.slug === "ad-sniper")!;

  it("penalises comps whose carry is contested, with diminishing returns", () => {
    const none = scoutPenalty(sniper, { contested: {} });
    const one = scoutPenalty(sniper, { contested: { "u-sniper": 1 } });
    const lots = scoutPenalty(sniper, { contested: { "u-sniper": 9 } });
    const three = scoutPenalty(sniper, { contested: { "u-sniper": 3 } });
    expect(none).toBe(0);
    expect(one).toBeGreaterThan(none);
    expect(lots).toBe(three);
  });

  it("lowers a contested comp's score by exactly its penalty", () => {
    const engine = testEngine();
    const bag = { BFSword: 1, SparringGloves: 1, RecurveBow: 1, NegatronCloak: 1 };
    const before = engine.rank(emptyState(bag)).find((r) => r.comp.slug === "ad-sniper")!;
    const scout = { contested: { "u-sniper": 2 } };
    const after = engine.rank({ ...emptyState(bag), scout }).find((r) => r.comp.slug === "ad-sniper")!;
    expect(after.scoutPenalty).toBeCloseTo(scoutPenalty(sniper, scout));
    expect(before.score - after.score).toBeCloseTo(after.scoutPenalty);
  });

  it("moves a contested comp below an equally good one", () => {
    // Same items, so only the tier (S 1.0 vs A 0.85) separates them until someone contests the S carry.
    const items: [string, number][] = [[ITEM.warmogs, 3]];
    const engine = testEngine([makeComp("s-comp", "S", "u-s", items), makeComp("a-comp", "A", "u-a", items)]);
    const bag = emptyState({ GiantsBelt: 2 });
    expect(engine.rank(bag)[0].comp.slug).toBe("s-comp");
    const contested = engine.rank({ ...bag, scout: { contested: { "u-s": 2 } } });
    expect(contested[0].comp.slug).toBe("a-comp");
  });

  it("suggests uncontested carries that share items", () => {
    const engine = testEngine();
    const scout = { contested: { "u-sniper": 2 } };
    const ranking = engine.rank({ ...emptyState({ BFSword: 1, SparringGloves: 1 }), scout });
    const swaps = carrySwaps(sniper, ranking, scout);
    expect(swaps.map((s) => s.comp.slug)).toEqual(["ad-bruiser"]);
    expect(swaps[0].sharedItems).toEqual(expect.arrayContaining([ITEM.infinityEdge, ITEM.bloodthirster]));
  });

  it("does not suggest a swap into another contested carry", () => {
    const scout = { contested: { "u-sniper": 2, "u-bruiser": 1 } };
    const ranking = testEngine().rank({ ...emptyState({ BFSword: 1 }), scout });
    expect(carrySwaps(sniper, ranking, scout)).toEqual([]);
  });

  it("only offers frontline alternatives nobody else holds", () => {
    const comp = makeComp("x", "A", "u-x", [[ITEM.warmogs, 3]], { frontlineAlternatives: ["t1", "t2", "t3"] });
    expect(openFrontline(comp, { contested: { t2: 2 } })).toEqual(["t1", "t3"]);
  });
});
