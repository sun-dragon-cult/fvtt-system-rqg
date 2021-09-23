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

export interface WeaponDataSourceData extends IPhysicalItem {
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

// --- Derived Data ---
export interface WeaponDataPropertiesData extends WeaponDataSourceData {}

export interface WeaponDataSource {
  type: ItemTypeEnum.Weapon;
  data: WeaponDataSourceData;
}

export interface WeaponDataProperties {
  type: ItemTypeEnum.Weapon;
  data: WeaponDataPropertiesData;
}

export const emptyWeapon: WeaponDataSourceData = {
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
