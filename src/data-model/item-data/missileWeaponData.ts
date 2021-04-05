import { emptyPrice, EquippedStatus, IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { RqgItem } from "../../items/rqgItem";
import { CombatManeuver } from "./meleeWeaponData";
import { ItemTypeEnum } from "./itemTypes";

export interface MissileWeaponData extends IPhysicalItem {
  /** id of skillItem (for weapon) */
  skillId: string;
  /** the uuid of the required skill Item */
  skillOrigin: string;
  /** Formula (for weapon) */
  damage: string;
  /** (for weapon) */
  combatManeuvers: CombatManeuver[];
  /** (for weapon) */
  minStrength: number;
  /** (for weapon) */
  minDexterity: number;
  /** meters at full chance, up to range*1.5 = 1/2 chance, up to range*2 1/4 chance */
  range: number;
  /** 0 = multiple/mr, 1 = 1/mr, 2 = 1/2mr, 3 = 1/3mr, 5 = 1/5mr */
  rate: number;
  hitPoints: Resource;
  isProjectile: boolean;
  /** No damage bonus & uses projectiles */
  isProjectileWeapon: boolean;
  /** If true add half DB, if false it's projectile with no db */
  isThrownWeapon: boolean;
  /** ItemId of ammunition for this projectile weapon */
  projectileId: string;
  description: string;

  // --- Derived / Convenience Data Below ---

  allCombatManeuvers?: any;
  missileWeaponSkills?: RqgItem[];
  ownedProjectiles?: RqgItem[];
  /** For showing the name of the linked skill if the item isn't owned */
  skillName?: string;
  isOwned?: boolean;
  /** For sheet dropdown */
  equippedStatuses?: EquippedStatus[];
}

export interface MissileWeaponItemData extends Item.Data<MissileWeaponData> {
  type: ItemTypeEnum.MissileWeapon;
}

export const emptyMissileWeapon: MissileWeaponData = {
  description: "",
  gmNotes: "",
  skillId: "",
  skillOrigin: "",
  damage: "1D3",
  combatManeuvers: [CombatManeuver.Knockback, CombatManeuver.Parry],
  minStrength: 0,
  minDexterity: 0,
  range: 0,
  rate: 0,
  hitPoints: emptyResource,
  encumbrance: 0,
  price: emptyPrice,
  equippedStatus: "carried",
  isProjectile: false,
  isProjectileWeapon: true,
  isThrownWeapon: false,
  projectileId: "",
  quantity: 1,
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};
