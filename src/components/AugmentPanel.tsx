"use client";

import { useMemo, useState } from "react";
import { augmentStages, catalog, comps, engine } from "@/data";
import type { AugmentTier } from "@/data/schema";
import type { Recommendation } from "@/engine/types";
import { useGame, useScout } from "@/store/useGame";
import { FlowNode } from "./flow";
import { CollapsibleGroup, TagPill } from "./ui";

const relevant = new Set(comps.flatMap((c) => c.augmentModifiers.map((m) => m.augment)));

const TIERS: AugmentTier[] = ["silver", "gold", "prismatic"];
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
  const augments = useGame((s) => s.augments);
  const skipped = useGame((s) => s.augmentSkipped);
  const skip = useGame((s) => s.skipAugment);

  return (
    <FlowNode
      step={3}
      title="Your augments"
      hint={`Click the augment you took at each selection, in order · patch ${augmentStages[0].patch}`}
    >
      <div className="space-y-3">
        {augmentStages.map((pool, i) => (
          <StagePanel key={pool.stage} selection={i} />
        ))}
      </div>

      {augments.length === 0 && !skipped && (
        <button onClick={skip} className="mt-3 text-sm text-muted underline decoration-line hover:text-gold-bright">
          No augment yet — show my options
        </button>
      )}
    </FlowNode>
  );
}

function StagePanel({ selection }: { selection: number }) {
  const [filter, setFilter] = useState("");
  const [openTiers, setOpenTiers] = useState<Set<AugmentTier>>(new Set());
  const components = useGame((s) => s.components);
  const items = useGame((s) => s.items);
  const board = useGame((s) => s.board);
  const augments = useGame((s) => s.augments);
  const level = useGame((s) => s.level);
  const scout = useScout();
  const pick = useGame((s) => s.pickAugment);

  const pool = augmentStages[selection];
  const locked = selection > augments.length;
  const picked = augments[selection];

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return pool.augments
      .filter(
        (a) =>
          a.id === picked ||
          (!augments.includes(a.id) && (!q || augmentLabel(a.id).toLowerCase().includes(q))),
      )
      .sort(
        (a, b) =>
          Number(relevant.has(b.id)) - Number(relevant.has(a.id)) ||
          augmentLabel(a.id).localeCompare(augmentLabel(b.id)),
      );
  }, [pool, filter, augments, picked]);

  const groups = useMemo(
    () => TIERS.map((tier) => ({ tier, augments: options.filter((a) => a.tier === tier) })),
    [options],
  );
  const searching = filter.trim() !== "";

  const choose = (id: string) => {
    pick(selection, id);
    setFilter("");
  };

  const toggleTier = (tier: AugmentTier) =>
    setOpenTiers((s) => {
      const next = new Set(s);
      if (!next.delete(tier)) next.add(tier);
      return next;
    });

  // How this pick moved the ranking, compared with the picks before it.
  const outcome = useMemo(() => {
    if (!picked) return null;
    const before = { components, items, board, augments: augments.slice(0, selection), scout, level };
    return engine.adviseAugments(before, [picked])[0];
  }, [picked, selection, components, items, board, augments, scout, level]);

  return (
    <div className={`rounded-lg border p-3 ${picked ? "border-gold/60" : "border-line"} ${locked ? "opacity-50" : ""}`}>
      <h3 className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold">
        <span>{pool.stage} augment</span>
        {picked && <span className="truncate text-xs font-normal text-gold">{augmentLabel(picked)}</span>}
      </h3>

      {locked ? (
        <p className="text-xs text-muted">Pick your {augmentStages[selection - 1].stage} augment first.</p>
      ) : (
        <>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              // Enter takes the first match, skipping the augment already picked here.
              const first = groups.flatMap((g) => g.augments).find((a) => a.id !== picked);
              if (e.key === "Enter" && first) choose(first.id);
              if (e.key === "Escape") setFilter("");
            }}
            placeholder="Search augments you are offered"
            aria-label={`Search ${pool.stage} augments`}
            className="mb-2 w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm placeholder:text-muted"
          />
          <div className="space-y-1.5">
            {groups.map(({ tier, augments: tierAugments }) =>
              searching && !tierAugments.length ? null : (
                <CollapsibleGroup
                  key={tier}
                  title={`${tier[0].toUpperCase()}${tier.slice(1)}`}
                  count={tierAugments.length}
                  open={searching || openTiers.has(tier)}
                  onToggle={() => toggleTier(tier)}
                  marker={<span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier]}`} aria-hidden />}
                >
                  <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                    {tierAugments.map((a) => {
                      const on = a.id === picked;
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => choose(a.id)}
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
                </CollapsibleGroup>
              ),
            )}
            {searching && !options.length && <p className="text-xs text-muted">No match.</p>}
          </div>
        </>
      )}

      {outcome && <Outcome ranking={outcome.ranking} topChanged={outcome.topChanged} />}
    </div>
  );
}

function Outcome({ ranking, topChanged }: { ranking: Recommendation[]; topChanged: boolean }) {
  const tagged = ranking.slice(0, 3).filter((r) => r.tags.length);
  const boosted = ranking.filter((r) => r.augmentBonus > 0).map((r) => r.comp.name);
  return (
    <div className="mt-3 border-t border-line pt-2 text-xs text-muted">
      <p>
        Best comp is <span className="text-gold-bright">{ranking[0].comp.name}</span>
        {topChanged ? " (this changed your top pick)" : ""}.
      </p>
      {tagged.length > 0 && (
        <ul className="mt-1 space-y-1">
          {tagged.map((r) => (
            <li key={r.comp.slug} className="flex flex-wrap items-center gap-2 text-gold-bright">
              {r.tags.map((t) => (
                <TagPill key={t} tag={t} />
              ))}
              <span>{r.comp.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1">
        {boosted.length > 0 ? `Your augments boost ${boosted.join(", ")}.` : "No curated comp is moved by your augments."}
      </p>
    </div>
  );
}
