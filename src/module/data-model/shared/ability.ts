export interface IAbility {
  chance: number;
  experience?: boolean;
}
// mod?: string; // Modification, roll modifier formula compatible 0.7.x feature? Let it be a separate interface

export enum ResultEnum {
  Critical,
  Special,
  Success,
  Failure,
  Fumble,
}

export class Ability implements IAbility {
  constructor(public chance: number = 0, public experience?: boolean) {}

  // Do a roll against this ability and factor in all modifiers.
  // stat - an object that implements IAbility
  // chanceMod - a +/- value that changes the chance
  // player character? see rule page 7 - round in favor of player
  public static rollAgainst(
    chance: number,
    chanceMod: number,
    flavor: string,
    pc: boolean
  ): ResultEnum {
    const r = new Roll("d100");
    r.roll();
    const modifiedChance: number = chance + chanceMod;
    const result = Ability.evaluateResult(modifiedChance, r.total, pc);
    const sign = chanceMod > 0 ? "+" : "";
    const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
    const resultText = game.i18n.localize(`ResultEnum.${result}`);
    r.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: `${flavor} (${chance}${chanceModText}%) ${resultText}`,
    });
    return result;
  }

  private static evaluateResult(
    chance: number,
    roll: number,
    pc: boolean
  ): ResultEnum {
    const rawCrit = Math.max(1, chance / 20);
    const critical = pc ? Math.ceil(rawCrit) : Math.floor(rawCrit);
    const rawSpecial = chance / 5;
    const special = pc ? Math.ceil(rawSpecial) : Math.floor(rawSpecial);
    const rawFumble = Math.min(100, 100 - (100 - chance) / 20);
    const fumble = pc ? Math.ceil(rawFumble) : Math.floor(rawFumble);
    const lookup = [
      { limit: critical, result: ResultEnum.Critical },
      { limit: special, result: ResultEnum.Special },
      { limit: chance, result: ResultEnum.Success },
      { limit: fumble - 1, result: ResultEnum.Failure },
      { limit: Infinity, result: ResultEnum.Fumble },
    ];

    return lookup.filter((v) => roll <= v.limit)[0].result;
  }
}

export const emptyAbility = new Ability();
