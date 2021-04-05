import { emptyPrice, EquippedStatus, IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { RqgItem } from "../../items/rqgItem";
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

  // --- Derived / Convenience Data Below ---

  allCombatManeuvers?: any;
  /** All relevant skills of the owning actor */
  meleeWeaponSkills?: RqgItem[];
  /** For showing the name of the linked skill if the item isn't owned */
  skillName?: string;
  isOwned?: boolean;
  /** For sheet dropdown */
  equippedStatuses?: EquippedStatus[];
}

export interface MeleeWeaponItemData extends Item.Data<MeleeWeaponData> {
  type: ItemTypeEnum.MeleeWeapon;
}

export const emptyMeleeWeapon: MeleeWeaponData = {
  description: "",
  gmNotes: "",
  skillId: "",
  skillOrigin: "",
  damage: "1D3",
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
