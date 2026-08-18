export type MagicPointSourcesAppRow = {
  id: string;
  /** Mirrors MagicPointDrawOrderEntry's union (see magic-point-source.ts). */
  kind: "self" | "item" | "ally" | "boundSpirit";
  /** Icon shown before the name - the item's img for a storage item, the actor's img for the
   *  ally or self rows. */
  img: string | undefined;
  name: string;
  value: number;
  max: number;
  /** 1-based draw priority among rows that still have points left; null once depleted. */
  priority: number | null;
  /** Max points this row could receive from self right now; 0 (and unused) for self/ally rows. */
  feedMax: number;
  /** The item a "boundSpirit" row's spirit is bound in (#999), shown as "{name} in {itemName}".
   *  Unset for every other row kind. */
  itemName?: string;
  itemImg?: string;
};

export type MagicPointSourcesAppContext = {
  rows: MagicPointSourcesAppRow[];
};
