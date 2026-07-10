/**
 * Pure enum/const definitions for hit-location-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const hitLocationHealthStatuses = ["healthy", "wounded", "useless", "severed"] as const;
export type HitLocationHealthState = (typeof hitLocationHealthStatuses)[number];

export const HitLocationTypesEnum = {
  Limb: "limb",
  Head: "head",
  Chest: "chest",
  Abdomen: "abdomen",
} as const;
export type HitLocationTypesEnum = (typeof HitLocationTypesEnum)[keyof typeof HitLocationTypesEnum];
