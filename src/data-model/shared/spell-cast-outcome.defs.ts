export const spellTargetOutcomeState = ["pending", "affected", "unaffected", "dismissed"] as const;
export type SpellTargetOutcomeState = (typeof spellTargetOutcomeState)[number];

export const spellTargetOutcomeResolvedBy = [
  "castOnly",
  "castFailed",
  "selfCast",
  "accepted",
  "resistanceRoll",
  "gmRuling",
] as const;
export type SpellTargetOutcomeResolvedBy = (typeof spellTargetOutcomeResolvedBy)[number];
