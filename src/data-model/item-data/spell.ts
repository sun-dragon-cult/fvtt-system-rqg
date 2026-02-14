import type { RqidLink } from "../shared/rqidLink";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import type { RuneMagicItem } from "@item-model/runeMagicData.ts";

/** For now a spell is either Spirit Magic or Rune Magic. Sorcery can be added here later. */
export type SpellItem = SpiritMagicItem | RuneMagicItem;
export const spellItemTypes = ["spiritMagic", "runeMagic"] as const; // Can't use ItemTypeEnum here because it is not initialized yet

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
export interface Spell {
  /** Learned strength */
  points: number;
  castingRange: SpellRangeEnum;
  duration: SpellDurationEnum;
  concentration: SpellConcentrationEnum; // All Sorcery is Active
  isRitual: boolean;
  /** Requires POW sacrifice by caster (possibly from others see core book p249) */
  isEnchantment: boolean;
  descriptionRqidLink: RqidLink | undefined;
}
