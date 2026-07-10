/**
 * Pure enum/const definitions for cult-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const CultRankEnum = {
  LayMember: "layMember",
  Initiate: "initiate",
  GodTalker: "godTalker",
  RunePriest: "runePriest",
  RuneLord: "runeLord",
  ChiefPriest: "chiefPriest",
  HighPriest: "highPriest",
} as const;
export type CultRankEnum = (typeof CultRankEnum)[keyof typeof CultRankEnum];
