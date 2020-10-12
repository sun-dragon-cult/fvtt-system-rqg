import { IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";

export enum AttackType {
  Crush = "crush",
  Slash = "slash",
  Impale = "impale",
}

export type MeleeWeaponData = IPhysicalItem & {
  category: string; // Required skill - link to name or id?
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
};

export const emptyMeleeWeapon: MeleeWeaponData = {
  description: "",
  category: "",
  damage: "1d3",
  attackTypes: [],
  minStrength: 0,
  minDexterity: 0,
  strikeRank: 0,
  hitPoints: emptyResource,
  encumbrance: 0,
  equipped: false,
};
