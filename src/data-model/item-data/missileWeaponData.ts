import { IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { RqgItem } from "../../items/rqgItem";
import { SkillData } from "./skillData";
import { CombatManeuver } from "./meleeWeaponData";

export type MissileWeaponData = IPhysicalItem & {
  skillId: string; // id of skillItem (for weapon)
  skillOrigin: string; // the uuid of the required skill Item
  damage: string; // Formula (for weapon)
  combatManeuvers: Array<CombatManeuver>; // (for weapon)
  minStrength: number; // (for weapon)
  minDexterity: number; // (for weapon)
  range: number; // meters at full chance, up to range*1.5 = 1/2 chance, up to range*2 1/4 chance
  rate: number; // 0 = multiple/mr, 1 = 1/mr, 2 = 1/2mr, 3 = 1/3mr, 5 = 1/5mr
  hitPoints: Resource;
  encumbrance: number;
  isEquipped: boolean;
  isProjectile: boolean;
  isProjectileWeapon: boolean; // No damage bonus & uses projectiles
  isThrownWeapon: boolean; // If true add half DB, if false it's projectile with no db
  projectileId: string; // ItemId of ammunition for this projectile weapon
  description: string;
  // --- Derived / Convenience Data Below ---
  allCombatManeuvers?: any;
  missileWeaponSkills?: Array<RqgItem<SkillData>>;
  ownedProjectiles?: Array<RqgItem<MissileWeaponData>>;
  skillName?: string; // For showing the name of the linked skill if the item isn't owned
  isOwned?: boolean;
};

export const emptyMissileWeapon: MissileWeaponData = {
  description: "",
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
  price: 0,
  isEquipped: false,
  isProjectile: false,
  isProjectileWeapon: true,
  isThrownWeapon: false,
  projectileId: "",
  quantity: 1,
};
