type LookupTableEntry<T> = {
  from: number;
  to: number;
  result: T;
};

export class RqgCalculations {
  public static dexSR(dex: number): number | undefined {
    return this.lookup<number | undefined>(dex, dexSrTable);
  }

  public static sizSR(siz: number): number | undefined {
    return this.lookup<number | undefined>(siz, sizSrTable);
  }

  public static hitPoints(con: number, siz: number, pow: number): number {
    let hp = con + RqgCalculations.linearMod(siz) / 5 + RqgCalculations.flattenedMod(pow) / 5;
    if (hp < 3) {
      // HP floor since 1 or 2 is unconscious.
      hp = 3;
    }
    return hp;
  }

  public static damageBonus(str: number, siz: number): string {
    if (str == null && siz == null) {
      return "0";
    }
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
    cha: number,
    isCreature: boolean
  ) {
    if (isCreature) {
      return {
        agility: 0,
        communication: 0,
        knowledge: 0,
        magic: 0,
        manipulation: 0,
        perception: 0,
        stealth: 0,
        meleeWeapons: 0,
        missileWeapons: 0,
        naturalWeapons: 0,
        shields: 0,
        otherSkills: 0,
      };
    }

    const agilityMod =
      RqgCalculations.flattenedMod(str) -
      RqgCalculations.flattenedMod(siz) +
      RqgCalculations.linearMod(dex) +
      RqgCalculations.flattenedMod(pow);

    const communicationMod =
      RqgCalculations.flattenedMod(int) +
      RqgCalculations.flattenedMod(pow) +
      RqgCalculations.linearMod(cha);
    const knowledgeMod = RqgCalculations.linearMod(int) + RqgCalculations.flattenedMod(pow);
    const magicMod = RqgCalculations.linearMod(pow) + RqgCalculations.flattenedMod(cha);
    const manipulationMod =
      RqgCalculations.flattenedMod(str) +
      RqgCalculations.linearMod(dex) +
      RqgCalculations.linearMod(int) +
      RqgCalculations.flattenedMod(pow);
    const perceptionMod = RqgCalculations.linearMod(int) + RqgCalculations.flattenedMod(pow);
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

  private static lookup<T>(v: number, table: LookupTableEntry<T>[]): T {
    const tableEntry: LookupTableEntry<T> | undefined = table.find(
      (te) => v >= te.from && v <= te.to
    );
    return tableEntry?.result as T;
  }
}

// DEX Strike Rank lookup
const dexSrTable: LookupTableEntry<number | undefined>[] = [
  { from: -Infinity, to: 0, result: undefined },
  { from: 1, to: 5, result: 5 },
  { from: 6, to: 8, result: 4 },
  { from: 9, to: 12, result: 3 },
  { from: 13, to: 15, result: 2 },
  { from: 16, to: 18, result: 1 },
  { from: 19, to: Infinity, result: 0 },
];

// SIZ Strike Rank lookup
const sizSrTable: LookupTableEntry<number | undefined>[] = [
  { from: -Infinity, to: 0, result: undefined },
  { from: 1, to: 6, result: 3 },
  { from: 7, to: 14, result: 2 },
  { from: 15, to: 21, result: 1 },
  { from: 22, to: Infinity, result: 0 },
];

// Damage Bonus <= 40 . Lookup with STR + SIZ
const damageBonusTable: LookupTableEntry<string>[] = [
  { from: -Infinity, to: 12, result: "-1d4" },
  { from: 13, to: 24, result: "0" },
  { from: 25, to: 32, result: "1d4" },
  { from: 33, to: 40, result: "1d6" },
];

// Spirit Combat Damage <= 40. Lookup with POW + CHA
const spiritCombatDamageTable: LookupTableEntry<string>[] = [
  { from: -Infinity, to: 12, result: "1d3" },
  { from: 13, to: 24, result: "1d6" },
  { from: 25, to: 32, result: "1d6+1" },
  { from: 33, to: 40, result: "1d6+3" },
];
