/** Operators a spell effect's target conditions compare an item's `system` data with. */
export const spellTargetConditionOps = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "includes",
  "nonEmpty",
] as const;
export type SpellTargetConditionOp = (typeof spellTargetConditionOps)[number];

/** What happens when no item on the target matches. Only "abort" until actor fallback is needed. */
export const spellTargetOnNoMatch = ["abort"] as const;
export type SpellTargetOnNoMatch = (typeof spellTargetOnNoMatch)[number];
