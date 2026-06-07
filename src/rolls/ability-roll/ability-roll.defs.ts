/** success levels, reused between AbilityRoll, CharacteristicRoll, SpiritMagicRoll & RuneMagicRoll  */
export const AbilitySuccessLevelEnum = {
  Critical: 0,
  Special: 1,
  Success: 2,
  Failure: 3,
  Fumble: 4,
} as const;
export type AbilitySuccessLevelEnum =
  (typeof AbilitySuccessLevelEnum)[keyof typeof AbilitySuccessLevelEnum];
