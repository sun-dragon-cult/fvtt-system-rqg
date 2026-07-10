/**
 * Exhaustive mapping from dynamic i18n key prefix → known suffix values.
 *
 * This file derives suffix values from the actual source enums/consts, so adding
 * a new enum value automatically includes the corresponding locale key in the
 * audit. The only thing maintained here is the prefix ↔ enum association.
 *
 * When you add a new enum that is used dynamically with localizeDynamic or
 * concat-based localization, add an entry here mapping the prefix to the enum.
 */

import { actorHealthStatuses, LocomotionEnum } from "../src/data-model/actor-data/attributes";
import { OccupationEnum, HomeLandEnum } from "../src/data-model/actor-data/background-enums";
import { CultRankEnum } from "../src/data-model/item-data/cult-enums";
import { SkillCategoryEnum } from "../src/data-model/item-data/skill-enums";
import { PassionsEnum } from "../src/data-model/item-data/passion-enums";
import { RuneTypeEnum } from "../src/data-model/item-data/rune-enums";
import { StandardOfLivingEnum } from "../src/data-model/item-data/occupation-enums";
import {
  hitLocationHealthStatuses,
  HitLocationTypesEnum,
} from "../src/data-model/item-data/hit-location-enums";
import { damageType, combatManeuverNames } from "../src/data-model/item-data/weapon-enums";
import {
  armorTypeTranslationKeys,
  materialTranslationKeys,
} from "../src/data-model/item-data/armor-enums";
import {
  equippedStatuses,
  physicalItemProperties,
} from "../src/data-model/item-data/i-physical-item";
import { weaponUsageTypes } from "../src/data-model/shared/weapon-usage-choices";
import {
  SpellRangeEnum,
  SpellDurationEnum,
  SpellConcentrationEnum,
} from "../src/data-model/item-data/spell";
import { AbilitySuccessLevelEnum } from "../src/rolls/ability-roll/ability-roll.defs";

// --- Characteristics (defined inline in schema, no separate enum) ---
const characteristics = [
  "strength",
  "constitution",
  "size",
  "dexterity",
  "intelligence",
  "power",
  "charisma",
] as const;
const characteristicsFull = characteristics.map((c) => `${c}-full`);

// --- Dialog options (defined inline in dialog classes, no separate enum) ---
const hitLocationFormulaOptions = ["1d20", "1d10", "1d10+10"] as const;
const rollDifficultyLevels = ["0", "1", "2", "3", "4", "5", "6"] as const;
const augmentOptions = [
  "None",
  "CriticalSuccess",
  "SpecialSuccess",
  "Success",
  "Failure",
  "Fumble",
] as const;
const meditateOptions = ["None", "1mr", "2mr", "5mr", "25mr", "50mr"] as const;
const ritualOptions = [
  "30min",
  "1h",
  "5h",
  "10h",
  "1d",
  "2d",
  "1week",
  "4weeks",
  "1season",
  "1year",
  "2years",
  "5years",
  "10years",
  "20years",
] as const;
const subsequentDefenceRolls = ["Second", "Third", "Fourth", "Fifth", "Sixth"] as const;

// --- Derived: AttackParry/Dodge result keys are cross-products of success levels ---
const abilityLevelValues = Object.values(AbilitySuccessLevelEnum);
const combatResultCombinations = abilityLevelValues.flatMap((atk) =>
  abilityLevelValues.map((def) => `${atk}-${def}`),
);

/**
 * Maps each dynamic i18n prefix to the exhaustive list of suffix values that
 * can appear at runtime. The audit script expands these to produce the exact
 * set of keys that are "used" dynamically.
 */
export const dynamicKeyMap: Record<string, readonly string[]> = {
  // Actor
  "RQG.Actor.Attributes.Health.": [...actorHealthStatuses],
  "RQG.Actor.Attributes.MoveMode.": Object.values(LocomotionEnum),
  "RQG.Actor.Background.Homeland.": Object.values(HomeLandEnum),
  "RQG.Actor.Background.Occupation.": [...Object.values(OccupationEnum).filter(Boolean), "none"],
  "RQG.Actor.Characteristics.": [...characteristics, ...characteristicsFull],
  "RQG.Actor.RuneMagic.CultRank.": Object.values(CultRankEnum),
  "RQG.Actor.Skill.SkillCategory.": Object.values(SkillCategoryEnum),

  // Dialog
  "RQG.Dialog.Attack.HitLocationFormulaOptions.": [...hitLocationFormulaOptions],
  "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.": [...rollDifficultyLevels],
  "RQG.Dialog.Common.AugmentOptions.": [...augmentOptions],
  "RQG.Dialog.Common.MeditateOptions.": [...meditateOptions],
  "RQG.Dialog.Common.RitualOptions.": [...ritualOptions],

  // Game
  "RQG.Game.AbilityResultEnum.": Object.values(AbilitySuccessLevelEnum).map(String),
  "RQG.Game.AttackParryResults.": combatResultCombinations,
  "RQG.Game.DodgeResults.": combatResultCombinations,
  "RQG.Game.WeaponUsage.": [...weaponUsageTypes],

  // Item - Armor (these are already full keys, treated as literal entries)
  "RQG.Item.Armor.ArmorMaterial.": materialTranslationKeys.map((k) =>
    k.replace("RQG.Item.Armor.ArmorMaterial.", ""),
  ),
  "RQG.Item.Armor.ArmorType.": armorTypeTranslationKeys.map((k) =>
    k.replace("RQG.Item.Armor.ArmorType.", ""),
  ),

  // Item - Equipment
  "RQG.Item.EquippedStatus.": [...equippedStatuses],
  "RQG.Item.Gear.PhysicalItemTypeEnum.": [...physicalItemProperties],

  // Item - Hit Location
  "RQG.Item.HitLocation.HealthStatusEnum.": [...hitLocationHealthStatuses],
  "RQG.Item.HitLocationType.": Object.values(HitLocationTypesEnum),

  // Item - Occupation
  "RQG.Item.Occupation.StandardOfLivingEnum.": Object.values(StandardOfLivingEnum),

  // Item - Passion
  "RQG.Item.Passion.PassionEnum.": Object.values(PassionsEnum).filter(Boolean),

  // Item - Rune
  "RQG.Item.Rune.RuneType.": Object.values(RuneTypeEnum),

  // Item - Spell
  "RQG.Item.Spell.ConcentrationEnum.": [...Object.values(SpellConcentrationEnum), "undefined"],
  "RQG.Item.Spell.DurationEnum.": [
    ...Object.values(SpellDurationEnum).filter(Boolean),
    "undefined",
  ],
  "RQG.Item.Spell.RangeEnum.": [...Object.values(SpellRangeEnum).filter(Boolean), "undefined"],

  // Item - Weapon
  "RQG.Item.Weapon.combatManeuver.": [...combatManeuverNames],
  "RQG.Item.Weapon.DamageTypeEnum.": Object.values(damageType),

  // Roll
  "RQG.Roll.AbilityRoll.SubsequentDefenceRoll.": [...subsequentDefenceRolls],
  "RQG.Roll.CharacteristicRoll.RollDifficultyLevel.": [...rollDifficultyLevels],
};
