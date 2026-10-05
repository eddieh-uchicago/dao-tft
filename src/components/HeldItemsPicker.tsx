"use client";

import { useMemo, useState } from "react";
import { catalog } from "@/data";
import type { HoldableItem } from "@/engine/catalog";
import { useGame } from "@/store/useGame";
import { FlowNode } from "./flow";
import { Icon } from "./Icon";

const MAX_RESULTS = 8;

type Kind = HoldableItem["kind"];
const KINDS: { kind: Kind | "all"; label: string }[] = [
  { kind: "all", label: "All" },
  { kind: "item", label: "Items" },
  { kind: "artifact", label: "Artifacts" },
  { kind: "emblem", label: "Emblems" },
];
const KIND_LABEL: Record<Kind, string> = { item: "Item", artifact: "Artifact", emblem: "Emblem" };

export function HeldItemsPicker() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const items = useGame((s) => s.items);
  const add = useGame((s) => s.addItem);
  const remove = useGame((s) => s.removeItem);

  const held = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of items) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].map(([id, count]) => ({ item: catalog.holdable(id), id, count }));
  }, [items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.holdables
      .filter((h) => (kind === "all" || h.kind === kind) && h.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
      .slice(0, MAX_RESULTS);
  }, [query, kind]);

  const pick = (id: string) => {
    add(id);
    setQuery("");
  };

  return (
    <FlowNode
      step={1}
      title="Completed items, artifacts & emblems"
      hint={items.length ? `${items.length} held · click one to remove it` : "Search for anything already built"}
    >
      {held.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {held.map(({ item, id, count }) => (
            <li key={id}>
              <button
                onClick={() => remove(id)}
                title={`Remove ${item?.name ?? id}`}
                className="flex items-center gap-1.5 rounded-full border border-gold bg-panel-2 py-0.5 pl-0.5 pr-2.5 text-sm hover:border-bad"
              >
                <Icon src={item?.icon ?? ""} label={item?.name ?? id} size={24} rounded="full" />
                {item?.name ?? id}
                {count > 1 && <span className="text-xs text-gold-bright">×{count}</span>}
                <span className="text-muted">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-2 flex gap-1" role="radiogroup" aria-label="Item type">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            role="radio"
            aria-checked={kind === k.kind}
            onClick={() => setKind(k.kind)}
            className={`rounded-md border px-2 py-0.5 text-xs ${
              kind === k.kind ? "border-gold bg-panel-2 text-gold-bright" : "border-line text-muted hover:border-muted"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) pick(results[0].id);
          if (e.key === "Escape") setQuery("");
        }}
        placeholder="Search, e.g. Rabadon, Fishbones, Coven"
        aria-label="Search completed items, artifacts and emblems"
        className="w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm placeholder:text-muted"
      />

      {query.trim() && (
        <ul className="mt-2 space-y-1">
          {results.length ? (
            results.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => pick(h.id)}
                  className="flex w-full items-center gap-2 rounded-md border border-line px-1.5 py-1 text-left text-sm hover:border-gold"
                >
                  <Icon src={h.icon} label={h.name} size={26} />
                  <span className="min-w-0 flex-1 truncate">{h.name}</span>
                  {h.components && (
                    <span className="hidden text-xs text-muted sm:inline">
                      {h.components.map((c) => catalog.componentName(c)).join(" + ")}
                    </span>
                  )}
                  <span className="rounded border border-line px-1 text-[10px] uppercase tracking-wide text-muted">
                    {KIND_LABEL[h.kind]}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted">No match.</li>
          )}
        </ul>
      )}
    </FlowNode>
  );
}
