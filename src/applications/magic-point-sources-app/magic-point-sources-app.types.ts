export type MagicPointSourcesAppRow = {
  id: string;
  /** Mirrors MagicPointDrawOrderEntry's "self" | "item" | "ally" union (see
   *  magic-point-source.ts) - "ally" is a linked Allied Spirit bond partner (#957), either
   *  direction, see getAlliedBondActor. */
  kind: "self" | "item" | "ally";
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
};

export type MagicPointSourcesAppContext = {
  rows: MagicPointSourcesAppRow[];
};
