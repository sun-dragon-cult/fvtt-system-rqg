import { IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { RqgItem } from "../../items/rqgItem";
import { SkillData } from "./skillData";

export enum CombatManeuver {
  Crush = "crush",
  Slash = "slash",
  Impale = "impale",
  Grapple = "grapple",
  Knockback = "knockback",
  Parry = "parry",
  Special = "special",
}

export type MeleeWeaponData = IPhysicalItem & {
  skillId: string; // id of skillItem
  damage: string; // Formula
  combatManeuvers: Array<CombatManeuver>;
  minStrength: number;
  minDexterity: number;
  strikeRank: number;
  hitPoints: Resource;
  encumbrance: number;
  equipped: boolean;
  natural: boolean; // E.g. Fist, Grapple, Kick
  description: string;
  // --- Derived / Convenience Data Below ---
  allCombatManeuvers?: any;
  meleeWeaponSkills?: Array<RqgItem<SkillData>>;
};

export const emptyMeleeWeapon: MeleeWeaponData = {
  description: "",
  skillId: "",
  damage: "1d3",
  combatManeuvers: [CombatManeuver.Knockback, CombatManeuver.Parry],
  minStrength: 0,
  minDexterity: 0,
  strikeRank: 0,
  hitPoints: emptyResource,
  encumbrance: 0,
  equipped: false,
  natural: false,
};
