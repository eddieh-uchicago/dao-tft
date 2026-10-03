import type { ReactNode } from "react";
import type { Fit, RecTag } from "@/engine/types";

export function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">{title}</h2>
        {hint && <p className="text-right text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const FIT_STYLE: Record<Fit, string> = {
  S: "bg-gold text-ink",
  A: "bg-good text-ink",
  B: "bg-warn text-ink",
  C: "bg-line text-gold-bright",
  D: "bg-panel-2 text-muted",
};

export function FitBadge({ fit }: { fit: Fit }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-sm font-bold ${FIT_STYLE[fit]}`}
      title="How well your current components fit this comp"
    >
      {fit}
    </span>
  );
}

const TAG_TEXT: Record<RecTag, { label: string; style: string; help: string }> = {
  "lock-in": {
    label: "Lock-in",
    style: "border-gold text-gold",
    help: "This augment makes the comp clearly your best line. Stop flexing.",
  },
  "flex-enabler": {
    label: "Flex enabler",
    style: "border-good text-good",
    help: "This augment opens a line that was not in your top 3.",
  },
};

export function TagPill({ tag }: { tag: RecTag }) {
  const t = TAG_TEXT[tag];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${t.style}`} title={t.help}>
      {t.label}
    </span>
  );
}

export function TierPill({ tier }: { tier: string }) {
  return (
    <span className="rounded border border-line px-1.5 py-0.5 text-xs text-muted" title="Curated tier for this patch">
      {tier} tier
    </span>
  );
}
