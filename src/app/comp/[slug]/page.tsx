import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Panel, TierPill } from "@/components/ui";
import { catalog, compBySlug, comps } from "@/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return comps.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/comp/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const comp = compBySlug(slug);
  return comp ? { title: `${comp.name} — Dao TFT`, description: comp.summary } : {};
}

function UnitChip({ id, highlight }: { id: string; highlight?: boolean }) {
  const u = catalog.unit(id);
  return (
    <li className="flex items-center gap-2">
      <Icon src={u.icon} label={u.name} size={40} rounded="full" />
      <span className={`text-sm ${highlight ? "font-semibold text-gold" : ""}`}>{u.name}</span>
    </li>
  );
}

export default async function CompPage({ params }: PageProps<"/comp/[slug]">) {
  const { slug } = await params;
  const comp = compBySlug(slug);
  if (!comp) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Link href="/" className="text-sm text-muted hover:text-gold-bright">
        ← Back to the router
      </Link>
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{comp.name}</h1>
          <TierPill tier={comp.tier} />
        </div>
        <p className="mt-1 text-muted">{comp.summary}</p>
      </header>

      <Panel title="Play it when">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {comp.playWhen.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="End board" hint="Carries highlighted">
        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          {comp.endBoard.map((u) => (
            <UnitChip key={u} id={u} highlight={comp.carries.includes(u)} />
          ))}
        </ul>
      </Panel>

      <Panel title="Items to build" hint="Weight 3 is core, 1 is flex">
        <ul className="divide-y divide-line">
          {comp.targetItems.map((t) => {
            const item = catalog.item(t.item);
            return (
              <li key={t.item + t.unit} className="flex items-center gap-3 py-2">
                <Icon src={item.icon} label={item.name} size={32} />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.components.map((c) => catalog.componentName(c)).join(" + ")} · on {catalog.unit(t.unit).name}
                  </p>
                </div>
                <span className="text-xs text-muted">{"●".repeat(t.weight)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Opener">
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
            {comp.opener.units.map((u) => (
              <UnitChip key={u} id={u} />
            ))}
          </ul>
          <p className="text-sm text-muted">{comp.opener.note}</p>
          {comp.slams.map((s) => (
            <p key={s.item + s.unit} className="mt-2 text-sm">
              <span className="text-gold">Slam:</span> {catalog.item(s.item).name} on {catalog.unit(s.unit).name}.{" "}
              <span className="text-muted">{s.note}</span>
            </p>
          ))}
        </Panel>
        <Panel title="Frontline">
          <p className="mb-2 text-xs text-muted">Core</p>
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
            {comp.frontline.map((u) => (
              <UnitChip key={u} id={u} />
            ))}
          </ul>
          <p className="mb-2 text-xs text-muted">Alternatives if these are contested</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {comp.frontlineAlternatives.map((u) => (
              <UnitChip key={u} id={u} />
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Stage by stage">
        <dl className="space-y-3 text-sm">
          {comp.stages.map(({ stage, tip }) => (
            <div key={stage}>
              <dt className="font-semibold text-gold">{stage}</dt>
              <dd className="text-muted">{tip}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {comp.augmentModifiers.length > 0 && (
        <Panel title="Augments that change the plan">
          <ul className="space-y-1 text-sm">
            {comp.augmentModifiers.map((m) => (
              <li key={m.augment}>
                <span className={m.bonus >= 0 ? "text-good" : "text-bad"}>{m.bonus >= 0 ? "+" : "−"}</span>{" "}
                <span className="font-medium">{catalog.augmentName(m.augment)}</span>{" "}
                <span className="text-muted">— {m.note}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </main>
  );
}
