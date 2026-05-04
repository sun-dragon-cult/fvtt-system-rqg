import { RqgCalculations } from "../../system/rqgCalculations";
import type { SkillCategories } from "./skillCategories";

export type CharacteristicDerivedInput = {
  str: number | null | undefined;
  con: number | null | undefined;
  siz: number | null | undefined;
  dex: number | null | undefined;
  int: number | null | undefined;
  pow: number | null | undefined;
  cha: number | null | undefined;
  isCreature: boolean;
};

export type CharacteristicDerivedValues = {
  dexStrikeRank: number | null | undefined;
  sizStrikeRank: number | null | undefined;
  damageBonus: string;
  healingRate: number;
  spiritCombatDamage: string;
  skillCategoryModifiers: SkillCategories;
};

export function getCharacteristicDerivedValues(
  input: CharacteristicDerivedInput,
): CharacteristicDerivedValues {
  const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
    input.str,
    input.siz,
    input.dex,
    input.int,
    input.pow,
    input.cha,
    input.isCreature,
  ) as SkillCategories;

  return {
    dexStrikeRank: RqgCalculations.dexSR(input.dex),
    sizStrikeRank: RqgCalculations.sizSR(input.siz),
    damageBonus: RqgCalculations.damageBonus(input.str, input.siz),
    healingRate: RqgCalculations.healingRate(input.con),
    spiritCombatDamage: RqgCalculations.spiritCombatDamage(input.pow, input.cha),
    skillCategoryModifiers,
  };
}
