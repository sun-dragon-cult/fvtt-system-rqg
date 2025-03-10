import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";
import type { UsageType } from "../../data-model/item-data/weaponData";
import type { RqgItem } from "../../items/rqgItem";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  type?: ItemTypeEnum;
  img: string | null;
  system: { chance: number };
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
};

export type AttackDialogHandlebarsData = {
  weaponItem: RqgItem | undefined;
  skillItem: RqgItem | undefined;
  abilityChance: number;

  object: AttackDialogObjectData;
  options: FormApplication.Options;
  title: string;
  ammoQuantity: number;
  isOutOfAmmo: boolean;
  usageTypeOptions: Record<string, string>;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  attackingActorOptions: Record<string, string>;
  attackingWeaponOptions: Record<string, string>;
  damageBonusSourceOptions: Record<string, string>;
  hitLocationFormulaOptions: Record<string, string>;
  halvedModifier: number;
  totalChance: number;
};

export type AttackDialogObjectData = {
  attackingActorUuid: string | undefined;
  attackingWeaponUuid: string | undefined;
  usageType: UsageType;
  augmentModifier: string;
  proneTarget: boolean;
  unawareTarget: boolean;
  darkness: boolean;
  halved: boolean;
  otherModifier: string;
  otherModifierDescription: string;
  attackExtraDamage: string;
  /** In the dialog it should be in the format `id:db` where the part before the colon is there to keep the select options unique */
  attackDamageBonus: string | undefined;
  hitLocationFormula: string;
};
