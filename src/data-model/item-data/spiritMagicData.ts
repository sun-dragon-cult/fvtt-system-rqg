import { ItemTypeEnum } from "./itemTypes";
import { Spell, SpellConcentrationEnum, SpellDurationEnum, SpellRangeEnum } from "./spell";
import { RqidLink } from "../shared/rqidLink";

export interface SpiritMagicDataSourceData extends Spell {
  /** Can the caster decide the number of magic points used */
  isVariable: boolean;
  /** Can't be cast if one of the listed spells are already active (not yet implemented) */
  incompatibleWith: string[];
  /** Textual representation of what the spell focus is */
  spellFocus: string;
  /** Should this spell be included for CHA limit calculations */
  isMatrix: boolean;
}

// --- Derived Data ---
export interface SpiritMagicDataPropertiesData extends SpiritMagicDataSourceData {}

export interface SpiritMagicDataSource {
  type: ItemTypeEnum.SpiritMagic;
  system: SpiritMagicDataSourceData;
}

export interface SpiritMagicDataProperties {
  type: ItemTypeEnum.SpiritMagic;
  system: SpiritMagicDataPropertiesData;
}

export const defaultSpiritMagicData: SpiritMagicDataSourceData = {
  descriptionRqidLink: new RqidLink(),
  points: 0,
  isVariable: false,
  isRitual: false,
  isEnchantment: false,
  castingRange: SpellRangeEnum.Ranged,
  duration: SpellDurationEnum.Instant,
  concentration: SpellConcentrationEnum.Passive,
  incompatibleWith: [],
  spellFocus: "",
  isMatrix: false,
};
