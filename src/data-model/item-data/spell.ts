import { IRqgItem } from "./IRqid";

export enum SpellRangeEnum {
  None = "",
  Self = "self",
  Touch = "touch",
  Ranged = "ranged", // Rune: 160m, Spirit: 50m, Sorcery: 10m
  Special = "special",
}

export enum SpellDurationEnum {
  None = "",
  Instant = "instant",
  Temporal = "temporal", // Rune: 15 min, Spirit: 2 min (10 MR), sorcery: 5 min
  Focused = "focused", // Active for as long as the caster focuses
  Permanent = "permanent", // Ritual (Enchantment)
  Special = "special", // Length of pregnancy / 12 hours / variable etc
}

export enum SpellConcentrationEnum {
  Passive = "passive",
  Active = "active",
}

// Se core book p247
export interface Spell
    extends IRqgItem {
  /** Learned strength */
  points: number;
  castingRange: SpellRangeEnum;
  duration: SpellDurationEnum;
  concentration: SpellConcentrationEnum; // All Sorcery is Active
  isRitual: boolean;
  /** Requires POW sacrifice by caster (possibly from others see core book p249) */
  isEnchantment: boolean;
}
