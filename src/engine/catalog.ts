import type { Snapshot, SnapshotItem, SnapshotTrait, SnapshotUnit } from "@/data/schema";
import type { ComponentBag, ComponentId } from "./types";

/** Lookup tables over a Community Dragon snapshot. */
export class Catalog {
  readonly componentIds: ComponentId[];
  private readonly items: Map<string, SnapshotItem>;
  private readonly units: Map<string, SnapshotUnit>;
  private readonly traits: Map<string, SnapshotTrait>;
  private readonly componentNames: Map<string, string>;
  private readonly componentIcons: Map<string, string>;
  private readonly augmentNames: Map<string, string>;

  constructor(readonly snapshot: Snapshot) {
    this.componentIds = snapshot.components.map((c) => c.id);
    this.items = new Map(snapshot.items.map((i) => [i.id, i]));
    this.units = new Map(snapshot.units.map((u) => [u.id, u]));
    this.traits = new Map(snapshot.traits.map((t) => [t.name, t]));
    this.componentNames = new Map(snapshot.components.map((c) => [c.id, c.name]));
    this.componentIcons = new Map(snapshot.components.map((c) => [c.id, c.icon]));
    this.augmentNames = new Map(snapshot.augments.map((a) => [a.id, a.name]));
  }

  hasItem(id: string): boolean {
    return this.items.has(id);
  }
  hasUnit(id: string): boolean {
    return this.units.has(id);
  }
  hasAugment(id: string): boolean {
    return this.augmentNames.has(id);
  }

  item(id: string): SnapshotItem {
    const item = this.items.get(id);
    if (!item) throw new Error(`Unknown item "${id}"`);
    return item;
  }
  unit(id: string): SnapshotUnit {
    const unit = this.units.get(id);
    if (!unit) throw new Error(`Unknown unit "${id}"`);
    return unit;
  }
  /** Traits of a unit, or none if the id is unknown (comps may reference retired units). */
  traitsOf(id: string): string[] {
    return this.units.get(id)?.traits ?? [];
  }
  /** Trait by display name, which is how units reference their traits. */
  trait(name: string): SnapshotTrait | undefined {
    return this.traits.get(name);
  }
  componentName(id: ComponentId): string {
    return this.componentNames.get(id) ?? id;
  }
  componentIcon(id: ComponentId): string {
    return this.componentIcons.get(id) ?? "";
  }
  augmentName(id: string): string {
    return this.augmentNames.get(id) ?? id;
  }
}

export function bagSize(bag: ComponentBag): number {
  let n = 0;
  for (const k in bag) n += bag[k];
  return n;
}

export function withComponent(bag: ComponentBag, id: ComponentId, delta = 1): ComponentBag {
  return { ...bag, [id]: Math.max(0, (bag[id] ?? 0) + delta) };
}
