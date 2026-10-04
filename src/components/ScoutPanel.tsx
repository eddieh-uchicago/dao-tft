"use client";

import { catalog } from "@/data";
import type { Recommendation } from "@/engine/types";
import { MAX_CONTEST, useGame } from "@/store/useGame";
import { Icon } from "./Icon";
import { Panel } from "./ui";

export function ScoutPanel({ ranking }: { ranking: Recommendation[] }) {
  const contested = useGame((s) => s.scout.contested);
  const setContested = useGame((s) => s.setContested);

  // Units that matter for the comps on screen, plus anything already flagged.
  const ids = new Set<string>(Object.keys(contested));
  for (const r of ranking.slice(0, 5)) {
    r.comp.carries.forEach((u) => ids.add(u));
    r.comp.frontline.forEach((u) => ids.add(u));
  }
  const units = [...ids].map((id) => catalog.unit(id)).sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));

  return (
    <Panel title="Scout" hint="How many opponents are playing each unit?">
      <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {units.map((u) => {
          const n = contested[u.id] ?? 0;
          return (
            <li key={u.id} className="flex items-center gap-2">
              <Icon src={u.icon} label={u.name} size={28} rounded="full" />
              <span className="flex-1 text-sm">{u.name}</span>
              <span className="text-xs text-muted">{u.cost}g</span>
              <div className="flex items-center gap-1" role="group" aria-label={`Opponents on ${u.name}`}>
                <button
                  onClick={() => setContested(u.id, n - 1)}
                  disabled={!n}
                  aria-label={`Fewer opponents on ${u.name}`}
                  className="h-6 w-6 rounded border border-line text-sm enabled:hover:border-muted disabled:opacity-30"
                >
                  −
                </button>
                <span className={`w-4 text-center text-sm ${n ? "font-bold text-bad" : "text-muted"}`}>{n}</span>
                <button
                  onClick={() => setContested(u.id, n + 1)}
                  disabled={n >= MAX_CONTEST}
                  aria-label={`More opponents on ${u.name}`}
                  className="h-6 w-6 rounded border border-line text-sm enabled:hover:border-muted disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
