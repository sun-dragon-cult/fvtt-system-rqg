/**
 * Pure enum/const definitions for rune-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const RuneTypeEnum = {
  Element: "element",
  Power: "power",
  Form: "form",
  Condition: "condition",
  Technique: "technique",
} as const;
export type RuneTypeEnum = (typeof RuneTypeEnum)[keyof typeof RuneTypeEnum];
