import { emptyPrice, IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";

export const damageType = {
  Crush: "crush",
  Slash: "slash",
  Impale: "impale",
  Parry: "parry",
  Special: "special",
} as const;
export type DamageType = typeof damageType[keyof typeof damageType];

export type CombatManeuver = {
  //** name used to identify this maneuver */
  name: string;
  damageType: DamageType;
  description?: string;
};

export type Usage = {
  /** id of the corresponding skill (when embedded) */
  skillId: string;
  /** the uuid of the required skill Item */
  skillOrigin: string;
  combatManeuvers: CombatManeuver[];
  /** Weapon damage formula */
  damage: string;
  minStrength: number;
  minDexterity: number;
  //** Melee weapon SR */
  strikeRank?: number;
};

export interface WeaponDataSourceData extends IPhysicalItem {
  /** This weapon can be used with different skills etc depending on usage */
  usage: {
    oneHand: Usage;
    twoHand: Usage;
    offHand: Usage;
    missile: Usage;
  };
  hitPoints: Resource;
  description: string;
  /** E.g. Fist, Grapple, Spit */
  isNatural: boolean;

  // --- missile weapon specific ---

  /** 0 =  s/mr (multiple/mr), 1 = 1/mr, 2 = 1/2mr, 3 = 1/3mr, 5 = 1/5mr */
  rate: number;
  /** meters at full chance, up to range*1.5 = 1/2 chance, up to range*2 1/4 chance */
  range: number;
  /** Can this weapon be used as a projectile - arrows for example */
  isProjectile: boolean;
  /** No damage bonus & uses projectiles */
  isProjectileWeapon: boolean;
  /** If true add half DB, if false it's projectile with no db */
  isThrownWeapon: boolean;
  /** ItemId of ammunition for this projectile weapon */
  projectileId: string;
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
  usage: {
    oneHand: {
      skillId: "",
      skillOrigin: "",

      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
      strikeRank: 0,
    },
    offHand: {
      skillId: "",
      skillOrigin: "",
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
      strikeRank: 0,
    },
    twoHand: {
      skillId: "",
      skillOrigin: "",
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
      strikeRank: 0,
    },
    missile: {
      skillId: "",
      skillOrigin: "",
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
    },
  },
  description: "",
  gmNotes: "",
  hitPoints: emptyResource,
  encumbrance: 0,
  location: "",
  attunedTo: "",
  physicalItemType: "unique",
  isContainer: false,
  price: emptyPrice,
  isNatural: false,
  equippedStatus: "carried",
  rate: 0,
  range: 0,
  isProjectile: false,
  isProjectileWeapon: false,
  isThrownWeapon: false,
  projectileId: "",
};
