/**
 * Pure enum/const definitions for occupation-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const StandardOfLivingEnum = {
  Destitute: "destitute",
  Poor: "poor",
  Free: "free",
  Noble: "noble",
  PettyKing: "petty-king",
} as const;
export type StandardOfLivingEnum = (typeof StandardOfLivingEnum)[keyof typeof StandardOfLivingEnum];
