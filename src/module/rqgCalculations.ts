import { HitLocationsEnum } from "./data-model/item-data/hitLocationData";

type LookupTableEntry<T> = {
  from: number;
  to: number;
  result: T;
};

export const humanoid: Array<string> = [
  HitLocationsEnum.Head,
  HitLocationsEnum.LeftArm,
  HitLocationsEnum.RightArm,
  HitLocationsEnum.Chest,
  HitLocationsEnum.Abdomen,
  HitLocationsEnum.LeftLeg,
  HitLocationsEnum.RightLeg,
];

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
      return `${d}D6`;
    }
  }

  public static spiritCombatDamage(pow: number, cha: number): string {
    const combined = pow + cha;
    if (combined <= 40) {
      return this.lookup<string>(combined, spiritCombatDamageTable);
    } else {
      const d = Math.ceil((combined - 40) / 16);
      return `${d + 2}D6+${d + 3}`;
    }
  }

  public static healingRate(con: number): number {
    return Math.ceil(con / 6);
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
  { from: 33, to: 40, result: "2D6" },
];

// Spirit Combat Damage <= 40. Lookup with POW + CHA
const spiritCombatDamageTable: Array<LookupTableEntry<string>> = [
  { from: -Infinity, to: 12, result: "1D3" },
  { from: 13, to: 24, result: "1D6" },
  { from: 25, to: 32, result: "1D6+1" },
  { from: 33, to: 40, result: "1D6+3" },
];
