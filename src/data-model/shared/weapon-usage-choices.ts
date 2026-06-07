import { enumChoices } from "./enum-choices";

export const weaponUsageTypes = ["oneHand", "twoHand", "offHand", "missile"] as const;

export type WeaponUsageType = (typeof weaponUsageTypes)[number];

export function weaponUsageChoices() {
  return enumChoices(weaponUsageTypes, (v) => `RQG.Game.WeaponUsage.${v}-full`);
}
