import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";

export enum SpiritMagicCastingRangeEnum {
  Self = "self",
  Touch = "touch",
  Ranged = "ranged", // 50 meters
}

export enum SpiritMagicDurationEnum {
  Instant = "instant",
  Temporal = "temporal", // 2 minutes (10 melee rounds)
  Focused = "focused", // Active for as long as the caster focuses
  Permanent = "permanent", // Ritual (Enchantment)
}

export enum SpiritMagicConcentrationEnum {
  Passive = "passive",
  Active = "active",
}

export interface SpiritMagicData extends JournalEntryLink {
  points: number; // Learned strength
  isVariable: boolean; // Can the caster decide the number of magic points used
  castingRange: SpiritMagicCastingRangeEnum;
  duration: SpiritMagicDurationEnum;
  concentration: SpiritMagicConcentrationEnum;
  incompatibleWith: string[]; // Can't be cast if one of the listed spells are already active
  spellFocus: string;
}

export interface SpiritMagicItemData extends Item.Data<SpiritMagicData> {
  type: ItemTypeEnum.SpiritMagic;
}

export const emptySpiritMagic: SpiritMagicData = {
  points: 0,
  isVariable: false,
  castingRange: SpiritMagicCastingRangeEnum.Ranged,
  duration: SpiritMagicDurationEnum.Instant,
  concentration: SpiritMagicConcentrationEnum.Passive,
  incompatibleWith: [],
  spellFocus: "",
  journalId: "",
  journalPack: "",
};
