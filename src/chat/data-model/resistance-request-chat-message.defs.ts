export const resistanceRequestState = ["Requested", "Rolled", "Accepted"] as const;

export const resistanceRequestRollerSide = ["active", "passive"] as const;

/** Which Roll class rehydrates an embedded spell-cast roll. */
export const resistanceRequestCastRollType = ["spiritMagic", "runeMagic"] as const;
