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
 * How a new cast meets the same or an incompatible spell already on the target. The Core Spirit
 * Magic Q&A "Replacing an Existing Spell" (Core p.255) says a recast of a spell still in effect has
 * no effect ("existingStays"); "strongestTakesEffect" reads it as being about refreshing, so a
 * stronger cast still replaces a weaker one (RBM p.5 only rules out layering); "latestDisplaces"
 * is a house rule where every cast replaces the previous one.
 */
export const spellStackingRules = [
  "existingStays",
  "strongestTakesEffect",
  "latestDisplaces",
] as const;
export type SpellStackingRule = (typeof spellStackingRules)[number];

/** Why the spell already on the target keeps a new casting from taking effect (stacking). */
export const spellStackingBlockedReasons = [
  "strongerActive",
  "sameActive",
  "incompatibleActive",
  "cancelledActive",
  "counteractedActive",
] as const;
export type SpellStackingBlockedReason = (typeof spellStackingBlockedReasons)[number];

/**
 * Why Apply left a target without the effect - recorded on the card, so Apply is used up:
 * stacking, or a protective effect on the target that stopped the spell (incoming-spell.ts).
 */
export const spellEffectBlockedReasons = [...spellStackingBlockedReasons, "intercepted"] as const;
export type SpellEffectBlockedReason = (typeof spellEffectBlockedReasons)[number];

/** What the card records when Apply left no effect: a blocked reason, or a behavior that did its work. */
export const spellEffectSettledReasons = [...spellEffectBlockedReasons, "resolved"] as const;
export type SpellEffectSettledReason = (typeof spellEffectSettledReasons)[number];
