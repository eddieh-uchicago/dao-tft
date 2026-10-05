"use client";

import { comps } from "@/data";
import { useGame } from "@/store/useGame";
import { Panel } from "./ui";

const byName = [...comps].sort((a, b) => a.name.localeCompare(b.name));

export function ScoutPanel() {
  const opponents = useGame((s) => s.opponents);
  const setOpponent = useGame((s) => s.setOpponent);

  return (
    <Panel title="Scout" hint="What is each opponent playing? Contested comps rank lower">
      <ul className="grid gap-2 sm:grid-cols-2">
        {opponents.map((slug, i) => {
          const label = `Opponent ${i + 1}`;
          return (
            <li key={i} className="flex items-center gap-2">
              <label htmlFor={`opponent-${i}`} className="w-24 shrink-0 text-sm text-muted">
                {label}
              </label>
              <select
                id={`opponent-${i}`}
                value={slug ?? ""}
                onChange={(e) => setOpponent(i, e.target.value || null)}
                className={`min-w-0 flex-1 rounded-md border bg-ink px-2 py-1.5 text-sm ${
                  slug ? "border-gold/60 text-gold-bright" : "border-line text-muted"
                }`}
              >
                <option value="">Unknown</option>
                {byName.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
