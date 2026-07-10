/**
 * Pure enum/const definitions for passion-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const PassionsEnum = {
  Ambition: "Ambition",
  Cowardly: "Cowardly",
  Devotion: "Devotion",
  Fear: "Fear",
  Hate: "Hate",
  Honor: "Honor",
  Loyalty: "Loyalty",
  Love: "Love",
  Gluttony: "Gluttony",
  Vanity: "Vanity",
  Custom: "",
} as const;
export type PassionsEnum = (typeof PassionsEnum)[keyof typeof PassionsEnum];
