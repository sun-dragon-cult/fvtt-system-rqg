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

/** Why the spell already on the target keeps a new casting from taking effect (stacking). */
export const spellStackingBlockedReasons = [
  "strongerActive",
  "incompatibleActive",
  "cancelledActive",
] as const;
export type SpellStackingBlockedReason = (typeof spellStackingBlockedReasons)[number];

/**
 * Why Apply left a target without the effect - recorded on the card, so Apply is used up:
 * stacking, or a protective effect on the target that stopped the spell (incoming-spell.ts).
 */
export const spellEffectBlockedReasons = [...spellStackingBlockedReasons, "intercepted"] as const;
export type SpellEffectBlockedReason = (typeof spellEffectBlockedReasons)[number];

/** What the card records when Apply left no effect: a blocked reason, or a behaviour that did its work. */
export const spellEffectSettledReasons = [...spellEffectBlockedReasons, "resolved"] as const;
export type SpellEffectSettledReason = (typeof spellEffectSettledReasons)[number];
