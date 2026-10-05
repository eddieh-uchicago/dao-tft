"use client";

import { useMemo } from "react";
import { engine } from "@/data";
import { bagSize } from "@/engine/catalog";
import { useGame } from "@/store/useGame";
import { AugmentPanel } from "./AugmentPanel";
import { BoardPicker } from "./BoardPicker";
import { ComponentPicker } from "./ComponentPicker";
import { HeldItemsPicker } from "./HeldItemsPicker";
import { Branch, Connector, FlowLabel } from "./flow";
import { CarouselPanel, SlamPanel } from "./InsightPanels";
import { RecommendationCard } from "./RecommendationCard";
import { ScoutPanel } from "./ScoutPanel";

const BRANCHES = 3;
const EXTRA = 2;

export function RouterApp() {
  const components = useGame((s) => s.components);
  const items = useGame((s) => s.items);
  const board = useGame((s) => s.board);
  const augments = useGame((s) => s.augments);
  const scout = useGame((s) => s.scout);
  const boardSkipped = useGame((s) => s.boardSkipped);
  const augmentSkipped = useGame((s) => s.augmentSkipped);

  // Each step appears once the one before it has an answer.
  const showBoard = bagSize(components) > 0 || items.length > 0;
  const showAugment = showBoard && (board.length > 0 || boardSkipped);
  const showResults = showAugment && (augments.length > 0 || augmentSkipped);

  const state = useMemo(
    () => ({ components, items, board, augments, scout }),
    [components, items, board, augments, scout],
  );
  const ranking = useMemo(() => engine.rank(state), [state]);
  const slams = useMemo(() => engine.slamNow(ranking), [ranking]);
  const carousel = useMemo(() => engine.carouselTargets(state), [state]);

  const extra = ranking.slice(BRANCHES, BRANCHES + EXTRA);

  const card = (i: number) => (
    <RecommendationCard
      rec={ranking[i]}
      rank={i + 1}
      ranking={ranking}
      contested={scout.contested}
    />
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {!showBoard && (
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <h1 className="text-3xl font-semibold text-gold">What are you holding?</h1>
          <p className="mt-2 text-sm text-muted">
            Start with your item components and anything already built. Dao TFT builds the path from there: your
            board, your augment, then the compositions worth playing.
          </p>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ComponentPicker />
        <HeldItemsPicker />
      </div>

      {showBoard && (
        <>
          <Connector />
          <BoardPicker />
        </>
      )}

      {showAugment && (
        <>
          <Connector />
          <AugmentPanel />
        </>
      )}

      {showResults && (
        <>
          <h1 className="sr-only">Your options</h1>
          <Branch>
            <SlamPanel slams={slams} />
            <CarouselPanel targets={carousel} />
            <ScoutPanel ranking={ranking} />
          </Branch>

          <div className="py-4">
            <Connector />
            <FlowLabel>Compositions you can play</FlowLabel>
          </div>

          <Branch>
            {Array.from({ length: BRANCHES }, (_, i) => (
              <div key={ranking[i].comp.slug}>{card(i)}</div>
            ))}
          </Branch>

          <details className="mt-6 rounded-lg border border-line bg-panel/60 p-4">
            <summary className="cursor-pointer text-sm text-muted hover:text-gold-bright">
              {extra.length} more option{extra.length === 1 ? "" : "s"}
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {extra.map((rec, i) => (
                <div key={rec.comp.slug}>{card(BRANCHES + i)}</div>
              ))}
            </div>
          </details>
        </>
      )}
    </main>
  );
}
