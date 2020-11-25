import { HitLocationsEnum } from "../data-model/item-data/hitLocationData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { CombatManeuver } from "../data-model/item-data/meleeWeaponData";
import { SkillCategoryEnum } from "../data-model/item-data/skillData";

type LookupTableEntry<T> = {
  from: number;
  to: number;
  result: T;
};

export const humanoid = {
  hitLocations: [
    // TODO needs Natural AP (for other races) and dieFrom/dieTo
    HitLocationsEnum.Head,
    HitLocationsEnum.LeftArm,
    HitLocationsEnum.RightArm,
    HitLocationsEnum.Chest,
    HitLocationsEnum.Abdomen,
    HitLocationsEnum.LeftLeg,
    HitLocationsEnum.RightLeg,
  ],
  naturalWeapons: {
    skills: [
      {
        name: "Fist",
        type: ItemTypeEnum.Skill,
        img: "icons/svg/mystery-man.svg",
        flags: {},
        data: {
          category: SkillCategoryEnum.NaturalWeapons,
          skillName: "Fist",
          specialization: "",
          baseChance: 25,
          learnedChance: 0,
          experience: false,
        },
      },
      {
        name: "Grapple",
        type: ItemTypeEnum.Skill,
        img: "icons/svg/mystery-man.svg",
        flags: {},
        data: {
          category: SkillCategoryEnum.NaturalWeapons,
          skillName: "Grapple",
          specialization: "",
          baseChance: 25,
          learnedChance: 0,
          experience: false,
        },
      },
      {
        name: "Kick",
        type: ItemTypeEnum.Skill,
        img: "icons/svg/mystery-man.svg",
        flags: {},
        data: {
          category: SkillCategoryEnum.NaturalWeapons,
          skillName: "Kick",
          specialization: "",
          baseChance: 15,
          learnedChance: 0,
          experience: false,
        },
      },
    ],
    meleeWeapons: [
      {
        name: "Fist",
        type: ItemTypeEnum.MeleeWeapon,
        data: {
          skillId: "",
          damage: "1D3",
          combatManeuvers: [
            CombatManeuver.Crush,
            CombatManeuver.Knockback,
            CombatManeuver.Parry,
          ],
          minStrength: 0,
          minDexterity: 0,
          strikeRank: 4,
          isEquipped: true,
          isNatural: true,
          hitPoints: {},
        },
        flags: {},
        img: "",
      },
      {
        name: "Grapple",
        type: ItemTypeEnum.MeleeWeapon,
        data: {
          skillId: "",
          damage: "",
          combatManeuvers: [CombatManeuver.Special],
          minStrength: 0,
          minDexterity: 0,
          strikeRank: 4,
          isEquipped: true,
          isNatural: true,
          hitPoints: {},
        },
        flags: {},
        img: "",
      },
      {
        name: "Kick",
        type: ItemTypeEnum.MeleeWeapon,
        data: {
          skillId: "",
          damage: "1D6",
          combatManeuvers: [
            CombatManeuver.Crush,
            CombatManeuver.Knockback,
            CombatManeuver.Parry,
          ],
          minStrength: 0,
          minDexterity: 0,
          strikeRank: 4,
          isEquipped: true,
          isNatural: true,
          hitPoints: {},
        },
        flags: {},
        img: "",
      },
    ],
  },
  characteristics: {
    // TODO Not used yet
    strength: "3D6",
    constitution: "3D6",
    size: "2D6+6",
    dexterity: "3D6",
    intelligence: "2D6+6",
    power: "3D6",
    charisma: "3D6",
  },
};

export class RqgCalculations {
  public static dexSR(dex: number): number {
    return this.lookup<number>(dex, dexSrTable);
  }

  public static sizSR(siz: number): number {
    return this.lookup<number>(siz, sizSrTable);
  }

  public static hitPoints(con: number, siz: number, pow: number): number {
    return (
      con + RqgCalculations.linearMod(siz) + RqgCalculations.flattenedMod(pow)
    );
  }

  public static damageBonus(str: number, siz: number): string {
    const combined = str + siz;
    if (combined <= 40) {
      return this.lookup<string>(str + siz, damageBonusTable);
    } else {
      const d = Math.ceil((combined - 40) / 16);
      return `${d + 1}D6`;
    }
  }

  public static spiritCombatDamage(pow: number, cha: number): string {
    const combined = pow + cha;
    if (combined <= 40) {
      return this.lookup<string>(combined, spiritCombatDamageTable);
    } else {
      const d = Math.ceil((combined - 40) / 16);
      return `${d + 1}D6+${d + 2}`;
    }
  }

  public static healingRate(con: number): number {
    return Math.ceil(con / 6);
  }

  public static skillCategoryModifiers(
    str: number,
    siz: number,
    dex: number,
    int: number,
    pow: number,
    cha: number
  ) {
    const agilityMod =
      RqgCalculations.flattenedMod(str) -
      RqgCalculations.flattenedMod(siz) +
      RqgCalculations.linearMod(dex) +
      RqgCalculations.flattenedMod(pow);

    const communicationMod =
      RqgCalculations.flattenedMod(int) +
      RqgCalculations.flattenedMod(pow) +
      RqgCalculations.linearMod(cha);
    const knowledgeMod =
      RqgCalculations.linearMod(int) + RqgCalculations.flattenedMod(pow);
    const magicMod =
      RqgCalculations.linearMod(pow) + RqgCalculations.flattenedMod(cha);
    const manipulationMod =
      RqgCalculations.flattenedMod(str) +
      RqgCalculations.linearMod(dex) +
      RqgCalculations.linearMod(int) +
      RqgCalculations.flattenedMod(pow);
    const perceptionMod =
      RqgCalculations.linearMod(int) + RqgCalculations.flattenedMod(pow);
    const stealthMod =
      RqgCalculations.linearMod(dex) -
      RqgCalculations.linearMod(siz) +
      RqgCalculations.linearMod(int) -
      RqgCalculations.flattenedMod(pow);

    return {
      agility: agilityMod,
      communication: communicationMod,
      knowledge: knowledgeMod,
      magic: magicMod,
      manipulation: manipulationMod,
      perception: perceptionMod,
      stealth: stealthMod,
      meleeWeapons: manipulationMod,
      missileWeapons: manipulationMod,
      naturalWeapons: manipulationMod,
      shields: manipulationMod,
      otherSkills: 0,
    };
  }

  public static linearMod(value: number): number {
    return (Math.ceil(value / 4) - 3) * 5;
  }

  public static flattenedMod(value: number): number {
    return value <= 4 ? -5 : value <= 16 ? 0 : (Math.ceil(value / 4) - 4) * 5;
  }

  private static lookup<T>(v: number, table: Array<LookupTableEntry<T>>): T {
    const tableEntry: LookupTableEntry<T> = table.find(
      (te) => v >= te.from && v <= te.to
    );
    return tableEntry ? tableEntry.result : null;
  }
}

// DEX Strike Rank lookup
const dexSrTable: Array<LookupTableEntry<number>> = [
  { from: -Infinity, to: 5, result: 5 },
  { from: 6, to: 8, result: 4 },
  { from: 9, to: 12, result: 3 },
  { from: 13, to: 15, result: 2 },
  { from: 16, to: 18, result: 1 },
  { from: 19, to: Infinity, result: 0 },
];

// SIZ Strike rank lookup
const sizSrTable: Array<LookupTableEntry<number>> = [
  { from: -Infinity, to: 6, result: 3 },
  { from: 7, to: 14, result: 2 },
  { from: 15, to: 21, result: 1 },
  { from: 22, to: Infinity, result: 0 },
];

// Damage Bonus <= 40 . Lookup with STR + SIZ
const damageBonusTable: Array<LookupTableEntry<string>> = [
  { from: -Infinity, to: 12, result: "-1D4" },
  { from: 13, to: 24, result: "0" },
  { from: 25, to: 32, result: "1D4" },
  { from: 33, to: 40, result: "1D6" },
];

// Spirit Combat Damage <= 40. Lookup with POW + CHA
const spiritCombatDamageTable: Array<LookupTableEntry<string>> = [
  { from: -Infinity, to: 12, result: "1D3" },
  { from: 13, to: 24, result: "1D6" },
  { from: 25, to: 32, result: "1D6+1" },
  { from: 33, to: 40, result: "1D6+3" },
];
