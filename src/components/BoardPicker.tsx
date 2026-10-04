"use client";

import { useMemo, useState } from "react";
import { catalog } from "@/data";
import { useGame } from "@/store/useGame";
import { FlowNode } from "./flow";
import { Icon } from "./Icon";

export function BoardPicker() {
  const [filter, setFilter] = useState("");
  const board = useGame((s) => s.board);
  const toggle = useGame((s) => s.toggleUnit);
  const skip = useGame((s) => s.skipBoard);

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return catalog.snapshot.units.filter((u) => !q || u.name.toLowerCase().includes(q));
  }, [filter]);

  return (
    <FlowNode step={2} title="Your 2-1 board" hint="Which units are you playing right now?">
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
                onClick={() => {
                  toggle(u.id);
                  setFilter("");
                }}
                aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-md border px-1.5 py-1 text-left text-sm ${
                  on ? "border-gold bg-panel-2" : "border-line hover:border-muted"
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
