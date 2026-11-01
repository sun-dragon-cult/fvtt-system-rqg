export const spellTargetOutcomeState = ["pending", "affected", "unaffected", "dismissed"] as const;
export type SpellTargetOutcomeState = (typeof spellTargetOutcomeState)[number];

export const spellTargetOutcomeResolvedBy = [
  "castOnly",
  "castFailed",
  "intercepted",
  "selfCast",
  "accepted",
  "resistanceRoll",
  "gmRuling",
  "reflected",
] as const;
export type SpellTargetOutcomeResolvedBy = (typeof spellTargetOutcomeResolvedBy)[number];

/** The states a GM can rule a target into. */
export const spellTargetRulingState = ["affected", "unaffected", "dismissed"] as const;
export type SpellTargetRulingState = (typeof spellTargetRulingState)[number];
