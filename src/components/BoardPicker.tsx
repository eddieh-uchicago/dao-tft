"use client";

import { useMemo, useState } from "react";
import { catalog } from "@/data";
import { LEVELS, useGame } from "@/store/useGame";
import { FlowNode } from "./flow";
import { Icon } from "./Icon";

/** 4- and 5-costs are not realistic on a 2-1 board. */
const MAX_COST = 3;

export function BoardPicker() {
  const [filter, setFilter] = useState("");
  const board = useGame((s) => s.board);
  const level = useGame((s) => s.level);
  const setLevel = useGame((s) => s.setLevel);
  const toggle = useGame((s) => s.toggleUnit);
  const full = board.length >= level;
  const skip = useGame((s) => s.skipBoard);

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return catalog.snapshot.units.filter(
      (u) => u.cost <= MAX_COST && (!q || u.name.toLowerCase().includes(q)),
    );
  }, [filter]);

  return (
    <FlowNode step={2} title="Your 2-1 board" hint="Which units are you playing right now?">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-muted">Level</span>
        <div role="radiogroup" aria-label="Player level" className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={`h-7 w-7 rounded-md border text-xs font-semibold ${
                level === l ? "border-gold bg-panel-2 text-gold-bright" : "border-line text-muted hover:border-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">
          {board.length}/{level} units
        </span>
      </div>

      {board.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {board.map((id) => {
            const u = catalog.unit(id);
            return (
              <li key={id}>
                <button
                  onClick={() => toggle(id)}
                  className="flex items-center gap-1.5 rounded-full border border-gold bg-panel-2 py-0.5 pl-0.5 pr-2.5 text-sm hover:border-bad"
                  title={`Remove ${u.name}`}
                >
                  <Icon src={u.icon} label={u.name} size={24} rounded="full" />
                  {u.name} ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search units"
        aria-label="Search units"
        className="mb-2 w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm placeholder:text-muted"
      />
      <ul className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
        {options.map((u) => {
          const on = board.includes(u.id);
          return (
            <li key={u.id}>
              <button
                disabled={!on && full}
                onClick={() => {
                  toggle(u.id);
                  setFilter("");
                }}
                aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-md border px-1.5 py-1 text-left text-sm ${
                  on ? "border-gold bg-panel-2" : "border-line enabled:hover:border-muted disabled:opacity-40"
                }`}
              >
                <Icon src={u.icon} label={u.name} size={26} rounded="full" />
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className="text-xs text-muted">{u.cost}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {board.length === 0 && (
        <button onClick={skip} className="mt-3 text-sm text-muted underline decoration-line hover:text-gold-bright">
          I have no units yet — continue
        </button>
      )}
    </FlowNode>
  );
}
