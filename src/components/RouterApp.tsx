"use client";

import { useMemo } from "react";
import { engine } from "@/data";
import { bagSize } from "@/engine/catalog";
import { useGame } from "@/store/useGame";
import { AugmentPanel } from "./AugmentPanel";
import { ComponentPicker } from "./ComponentPicker";
import { CarouselPanel, SlamPanel } from "./InsightPanels";
import { RecommendationCard } from "./RecommendationCard";
import { ScoutPanel } from "./ScoutPanel";

const TOP_N = 5;
const EXAMPLE = { RecurveBow: 1, TearOfTheGoddess: 1, NeedlesslyLargeRod: 1 };

export function RouterApp() {
  const components = useGame((s) => s.components);
  const augments = useGame((s) => s.augments);
  const scout = useGame((s) => s.scout);
  const addComponent = useGame((s) => s.addComponent);
  const empty = bagSize(components) === 0;

  const state = useMemo(() => ({ components, augments, scout }), [components, augments, scout]);
  const ranking = useMemo(() => engine.rank(state), [state]);
  const slams = useMemo(() => engine.slamNow(ranking), [ranking]);
  const carousel = useMemo(() => engine.carouselTargets(state), [state]);

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[22rem_1fr]">
      <aside className="space-y-4">
        <ComponentPicker />
        <AugmentPanel />
        <ScoutPanel ranking={ranking} />
      </aside>

      <div className="space-y-4">
        {empty ? (
          <div className="rounded-lg border border-dashed border-line p-8 text-center">
            <h1 className="text-2xl font-semibold text-gold">What do you have right now?</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Add the item components from your creep rounds. Dao TFT ranks the comps they build toward, shows what to
              slam, and tells you which component to look for next.
            </p>
            <button
              onClick={() => Object.entries(EXAMPLE).forEach(([id, n]) => Array.from({ length: n }, () => addComponent(id)))}
              className="mt-4 rounded-md border border-gold px-4 py-2 text-sm text-gold hover:bg-panel-2"
            >
              Try Bow + Tear + Rod
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <SlamPanel slams={slams} />
              <CarouselPanel targets={carousel} />
            </div>
            <h1 className="sr-only">Ranked compositions</h1>
            {ranking.slice(0, TOP_N).map((rec, i) => (
              <RecommendationCard
                key={rec.comp.slug}
                rec={rec}
                rank={i + 1}
                ranking={ranking}
                contested={scout.contested}
              />
            ))}
          </>
        )}
      </div>
    </main>
  );
}
