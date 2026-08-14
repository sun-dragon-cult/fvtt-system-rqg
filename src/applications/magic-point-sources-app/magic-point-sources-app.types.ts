export type MagicPointSourcesAppRow = {
  id: string;
  isSelf: boolean;
  name: string;
  value: number;
  max: number;
  /** 1-based draw priority among rows that still have points left; null once depleted. */
  priority: number | null;
  /** Max points this row could receive from self right now; 0 (and unused) for the self row. */
  feedMax: number;
};

export type MagicPointSourcesAppContext = {
  rows: MagicPointSourcesAppRow[];
};
