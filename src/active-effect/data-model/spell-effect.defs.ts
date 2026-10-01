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

/**
 * How a new cast meets the same or an incompatible spell already on the target. RAW has no effect
 * unless it is stronger (Core Spirit Magic Q&A "Replacing an Existing Spell"); the Q&A also offers
 * letting every cast displace the previous one (RBM Rune Magic Q&A).
 */
export const spellStackingRules = ["strongestTakesEffect", "latestDisplaces"] as const;
export type SpellStackingRule = (typeof spellStackingRules)[number];

/** Why Apply left a target without the effect - recorded on the card, so Apply is used up. */
export const spellEffectBlockedReasons = [
  "strongerActive",
  "incompatibleActive",
  "cancelledActive",
] as const;
export type SpellEffectBlockedReason = (typeof spellEffectBlockedReasons)[number];
