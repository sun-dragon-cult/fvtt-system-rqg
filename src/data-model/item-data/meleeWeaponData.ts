import { emptyPrice, IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";

export enum CombatManeuver {
  Crush = "crush",
  Slash = "slash",
  Impale = "impale",
  Grapple = "grapple",
  Knockback = "knockback",
  Parry = "parry",
  Special = "special",
}

export interface MeleeWeaponData extends IPhysicalItem {
  /** id of the corresponding skill (when embedded) */
  skillId: string;
  /** the uuid of the required skill Item */
  skillOrigin: string;
  damage: string; // Formula
  combatManeuvers: CombatManeuver[];
  minStrength: number;
  minDexterity: number;
  strikeRank: number;
  hitPoints: Resource;
  /** E.g. Fist, Grapple, Kick */
  isNatural: boolean;
  description: string;
}

export interface MeleeWeaponItemData extends Item.Data<MeleeWeaponData> {
  type: ItemTypeEnum.MeleeWeapon;
}

export const emptyMeleeWeapon: MeleeWeaponData = {
  description: "",
  gmNotes: "",
  skillId: "",
  skillOrigin: "",
  damage: "1d3",
  combatManeuvers: [CombatManeuver.Knockback, CombatManeuver.Parry],
  minStrength: 0,
  minDexterity: 0,
  strikeRank: 0,
  hitPoints: emptyResource,
  encumbrance: 0,
  price: emptyPrice,
  equippedStatus: "carried",
  isNatural: false,
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};
