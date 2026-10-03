import Link from "next/link";
import { catalog, compBySlug } from "@/data";
import type { CarouselTarget, SlamSuggestion } from "@/engine/types";
import { Icon } from "./Icon";
import { Panel } from "./ui";

export function SlamPanel({ slams }: { slams: SlamSuggestion[] }) {
  return (
    <Panel title="Slam now" hint="Items you can craft that your top comps want">
      {slams.length ? (
        <ul className="space-y-2">
          {slams.map((s) => {
            const item = catalog.item(s.item);
            return (
              <li key={s.item} className="flex items-center gap-3">
                <Icon src={item.icon} label={item.name} size={36} />
                <div className="text-sm">
                  <p className="font-medium">
                    {item.name} <span className="font-normal text-muted">on {catalog.unit(s.unit).name}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {s.uses.map((c) => catalog.componentName(c)).join(" + ")} · wanted by {s.comps.length} of your top 3
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">No completed item fits your top comps yet. Hold your components.</p>
      )}
    </Panel>
  );
}

export function CarouselPanel({ targets }: { targets: CarouselTarget[] }) {
  return (
    <Panel title="Hit next" hint="Components that move you toward a comp">
      {targets.length ? (
        <ul className="space-y-2">
          {targets.slice(0, 4).map((t) => {
            const name = catalog.componentName(t.component);
            const best = compBySlug(t.bestComp);
            return (
              <li key={t.component} className="flex items-center gap-3">
                <Icon src={catalog.componentIcon(t.component)} label={name} size={36} />
                <div className="text-sm">
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted">
                    {t.unlocks.length > 0 ? (
                      <>Builds {t.unlocks.map((i) => catalog.item(i).name).join(", ")} for </>
                    ) : (
                      <>Helps </>
                    )}
                    {best && (
                      <Link href={`/comp/${best.slug}`} className="text-gold-bright underline decoration-line">
                        {best.name}
                      </Link>
                    )}
                    {t.entersTop3.length > 0 && (
                      <span className="text-good">
                        {" "}
                        · puts {t.entersTop3.map((s) => compBySlug(s)?.name ?? s).join(", ")} in your top 3
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Add components to see what to look for on the carousel.</p>
      )}
    </Panel>
  );
}
