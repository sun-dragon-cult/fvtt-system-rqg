export const spellTargetReachWarnings = ["outOfRange", "outOfSight", "notTouching"] as const;
/** Why a token target may be beyond a spell's reach (RBM p.6); "" when nothing speaks against it. */
export type SpellTargetReachWarning = (typeof spellTargetReachWarnings)[number] | "";
