export type MagicPointSourcesAppRow = {
  id: string;
  isSelf: boolean;
  name: string;
  value: number;
  max: number;
  /** 1-based draw priority among rows that still have points left; null once depleted. */
  priority: number | null;
};

export type MagicPointSourcesAppContext = {
  rows: MagicPointSourcesAppRow[];
};
