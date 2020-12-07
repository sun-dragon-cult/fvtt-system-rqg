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
  skillId: string; // id of the corresponding skill (when embedded)
  skillOrigin: string; // the uuid of the required skill Item
  damage: string; // Formula
  combatManeuvers: Array<CombatManeuver>;
  minStrength: number;
  minDexterity: number;
  strikeRank: number;
  hitPoints: Resource;
  encumbrance: number;
  isEquipped: boolean;
  isNatural: boolean; // E.g. Fist, Grapple, Kick
  description: string;
  // --- Derived / Convenience Data Below ---
  allCombatManeuvers?: any;
  meleeWeaponSkills?: Array<RqgItem<SkillData>>; // All relevant skills of the owning actor
  skillName?: string; // For showing the name of the linked skill if the item isn't owned
  isOwned?: boolean;
};

export const emptyMeleeWeapon: MeleeWeaponData = {
  description: "",
  skillId: "",
  skillOrigin: "",
  damage: "1D3",
  combatManeuvers: [CombatManeuver.Knockback, CombatManeuver.Parry],
  minStrength: 0,
  minDexterity: 0,
  strikeRank: 0,
  hitPoints: emptyResource,
  encumbrance: 0,
  isEquipped: false,
  isNatural: false,
};
