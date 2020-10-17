import { IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { RqgItem } from "../../items/rqgItem";
import { SkillData } from "./skillData";

export enum AttackType {
  Crush = "crush",
  Slash = "slash",
  Impale = "impale",
}

export type MeleeWeaponData = IPhysicalItem & {
  skillId: string; // id of skillItem
  damage: string; // Formula
  attackTypes: Array<AttackType>;
  minStrength: number;
  minDexterity: number;
  strikeRank: number;
  hitPoints: Resource;
  encumbrance: number;
  equipped: boolean;
  description: string;
  // --- Derived / Convenience Data Below ---
  presentationAttackTypes?: {
    crush?: boolean;
    slash?: boolean;
    impale?: boolean;
  };
  meleeWeaponSkills?: Array<RqgItem<SkillData>>;
};

export const emptyMeleeWeapon: MeleeWeaponData = {
  description: "",
  skillId: "",
  damage: "1d3",
  attackTypes: [],
  minStrength: 0,
  minDexterity: 0,
  strikeRank: 0,
  hitPoints: emptyResource,
  encumbrance: 0,
  equipped: false,
};
