"use client";

import { useMemo, useState } from "react";
import { augments21, catalog, comps, engine } from "@/data";
import type { AugmentTier } from "@/data/schema";
import { MAX_OFFERS, useGame } from "@/store/useGame";
import { FlowNode } from "./flow";
import { TagPill } from "./ui";

const relevant = new Set(comps.flatMap((c) => c.augmentModifiers.map((m) => m.augment)));

const TIER_ORDER: Record<AugmentTier, number> = { silver: 0, gold: 1, prismatic: 2 };
const TIER_DOT: Record<AugmentTier, string> = {
  silver: "bg-slate-300",
  gold: "bg-amber-400",
  prismatic: "bg-fuchsia-400",
};

const nameCounts = new Map<string, number>();
for (const a of catalog.snapshot.augments) nameCounts.set(a.name, (nameCounts.get(a.name) ?? 0) + 1);

/** Some augments share a name (Beast Within for Nidalee and for Sivir); tell them apart. */
function augmentLabel(id: string): string {
  const name = catalog.augmentName(id);
  return (nameCounts.get(name) ?? 0) > 1 ? `${name} (${id.split("_").pop()})` : name;
}

export function AugmentPanel() {
  const [filter, setFilter] = useState("");
  const components = useGame((s) => s.components);
  const items = useGame((s) => s.items);
  const augments = useGame((s) => s.augments);
  const scout = useGame((s) => s.scout);
  const offers = useGame((s) => s.offers);
  const toggleOffer = useGame((s) => s.toggleOffer);
  const take = useGame((s) => s.takeAugment);
  const drop = useGame((s) => s.dropAugment);
  const skip = useGame((s) => s.skipAugment);
  const board = useGame((s) => s.board);

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return augments21.augments
      .filter((a) => !augments.includes(a.id) && (!q || augmentLabel(a.id).toLowerCase().includes(q)))
      .sort(
        (a, b) =>
          Number(relevant.has(b.id)) - Number(relevant.has(a.id)) ||
          TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
          augmentLabel(a.id).localeCompare(augmentLabel(b.id)),
      );
  }, [filter, augments]);

  const advice = useMemo(
    () => engine.adviseAugments({ components, items, board, augments, scout }, offers),
    [components, items, board, augments, scout, offers],
  );

  return (
    <FlowNode
      step={3}
      title="Your 2-1 augment"
      hint={`Select up to ${MAX_OFFERS} offers to compare, then take one · patch ${augments21.patch}`}
    >
      {augments.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {augments.map((id) => (
            <li key={id}>
              <button
                onClick={() => drop(id)}
                className="rounded-full border border-gold px-2.5 py-1 text-xs text-gold hover:bg-panel-2"
                title="Remove this augment"
              >
                {augmentLabel(id)} ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search augments you are offered"
        aria-label="Search augments"
        className="mb-2 w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm placeholder:text-muted"
      />
      <ul className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((a) => {
          const on = offers.includes(a.id);
          return (
            <li key={a.id}>
              <button
                onClick={() => {
                  toggleOffer(a.id);
                  setFilter("");
                }}
                aria-pressed={on}
                title={`${a.tier[0].toUpperCase()}${a.tier.slice(1)} augment`}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  on
                    ? "border-gold bg-gold text-ink"
                    : relevant.has(a.id)
                      ? "border-line text-gold-bright hover:border-gold"
                      : "border-line text-muted hover:border-muted"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[a.tier]}`} aria-hidden />
                {augmentLabel(a.id)}
              </button>
            </li>
          );
        })}
      </ul>

      {augments.length === 0 && (
        <button onClick={skip} className="mt-3 text-sm text-muted underline decoration-line hover:text-gold-bright">
          No augment yet — show my options
        </button>
      )}

      {advice.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-line pt-3">
          {advice.map(({ augment, ranking, topChanged }) => {
            const tagged = ranking.slice(0, 3).filter((r) => r.tags.length);
            const boosted = ranking.filter((r) => r.augmentBonus > 0).map((r) => r.comp.name);
            return (
              <li key={augment} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{augmentLabel(augment)}</span>
                  <button
                    onClick={() => take(augment)}
                    className="rounded border border-good px-2 py-0.5 text-xs text-good hover:bg-panel-2"
                  >
                    Take
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Best comp becomes <span className="text-gold-bright">{ranking[0].comp.name}</span>
                  {topChanged ? " (changes your top pick)" : ""}.
                </p>
                {tagged.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {tagged.map((r) => (
                      <li key={r.comp.slug} className="flex flex-wrap items-center gap-2 text-xs">
                        {r.tags.map((t) => (
                          <TagPill key={t} tag={t} />
                        ))}
                        <span>{r.comp.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-muted">
                  {boosted.length > 0
                    ? `Boosts ${boosted.join(", ")}.`
                    : "No curated comp is moved by this augment."}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </FlowNode>
  );
}
