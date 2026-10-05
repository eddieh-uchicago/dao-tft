import Link from "next/link";
import { catalog } from "@/data";
import type { Recommendation } from "@/engine/types";
import { carrySwaps, openFrontline } from "@/engine/scout";
import { Icon } from "./Icon";
import { FitBadge, TagPill, TierPill } from "./ui";

interface Props {
  rec: Recommendation;
  rank: number;
  ranking: Recommendation[];
  contested: Record<string, number>;
}

export function RecommendationCard({ rec, rank, ranking, contested }: Props) {
  const { comp, allocation } = rec;
  const scout = { contested };
  const swaps = rec.scoutPenalty > 0 ? carrySwaps(comp, ranking, scout) : [];
  const frontline = rec.scoutPenalty > 0 ? openFrontline(comp, scout) : [];
  const carry = catalog.unit(comp.carries[0]);

  return (
    <article className="rounded-lg border border-line bg-panel p-4">
      <header>
        <div className="flex items-center gap-3">
          <span className="w-3 text-sm text-muted">{rank}</span>
          <Icon src={carry.icon} label={carry.name} size={44} rounded="full" />
          <div className="min-w-0 flex-1">
            <Link href={`/comp/${comp.slug}`} className="text-lg font-semibold leading-tight hover:text-gold">
              {comp.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <TierPill tier={comp.tier} />
              {rec.tags.map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </div>
          </div>
          <FitBadge fit={rec.fit} />
        </div>
        <p className="mt-2 text-sm text-muted">{comp.summary}</p>
      </header>

      <div className="mt-3 space-y-3">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-good">Buildable now</h3>
          {allocation.built.length ? (
            <ul className="space-y-1">
              {allocation.built.map((b) => (
                <li key={b.item + b.unit} className="flex items-center gap-2 text-sm">
                  <Icon src={catalog.item(b.item).icon} label={catalog.item(b.item).name} size={24} />
                  <span>{catalog.item(b.item).name}</span>
                  <span className="text-xs text-muted">
                    on {catalog.unit(b.unit).name}
                    {b.held && " · already held"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing completes yet.</p>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-warn">Still missing</h3>
          <ul className="space-y-1">
            {allocation.pending.slice(0, 3).map((p) => (
              <li key={p.item + p.unit} className="flex flex-wrap items-center gap-x-2 text-sm">
                <span>{catalog.item(p.item).name}</span>
                <span className="text-xs text-muted">
                  needs {p.need.map((c) => catalog.componentName(c)).join(" + ")}
                  {p.have.length > 0 && ` (have ${p.have.map((c) => catalog.componentName(c)).join(", ")})`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(rec.augmentNotes.length > 0 || rec.scoutPenalty > 0 || rec.boardMatches.length > 0) && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {rec.boardMatches.length > 0 && (
            <li className="text-good">
              + Your board already plays {rec.boardMatches.map((u) => catalog.unit(u).name).join(", ")}.
            </li>
          )}
          {rec.augmentNotes.map((n) => (
            <li key={n} className="text-good">
              + {n}
            </li>
          ))}
          {rec.scoutPenalty > 0 && (
            <li className="text-bad">− Opponents are playing this comp&apos;s units, so it is ranked lower.</li>
          )}
          {swaps.length > 0 && (
            <li className="text-muted">
              Same items, less contested:{" "}
              {swaps.map((s, i) => (
                <span key={s.comp.slug}>
                  {i > 0 && ", "}
                  <Link href={`/comp/${s.comp.slug}`} className="text-gold-bright underline decoration-line">
                    {s.comp.name}
                  </Link>{" "}
                  ({s.sharedItems.map((i) => catalog.item(i).name).join(", ")})
                </span>
              ))}
            </li>
          )}
          {frontline.length > 0 && (
            <li className="text-muted">
              Open frontline options: {frontline.map((u) => catalog.unit(u).name).join(", ")}
            </li>
          )}
        </ul>
      )}
    </article>
  );
}
