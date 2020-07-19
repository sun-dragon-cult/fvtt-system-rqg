export interface IAbility {
  chance: number;
  experience?: boolean;
}
// mod?: string; // Modification, roll modifier formula compatible 0.7.x feature? Let it be a separate interface

export enum ResultEnum {
  HyperCritical,
  SpecialCritical,
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
    flavor: string
  ): ResultEnum {
    const r = new Roll("d100");
    r.roll();
    const modifiedChance: number = chance + chanceMod;
    const result = Ability.evaluateResult(modifiedChance, r.total);
    const sign = chanceMod > 0 ? "+" : "";
    const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
    const resultText = game.i18n.localize(`ResultEnum.${result}`);
    r.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: `${flavor} (${chance}${chanceModText}%) ${resultText}`,
    });
    return result;
  }

  private static evaluateResult(chance: number, roll: number): ResultEnum {
    const specialCritSetting = game.settings.get("rqg", "specialCrit");

    const rawHyperCritical = chance / 500;
    const hyperCritical =
      specialCritSetting && chance >= 100 ? Math.ceil(rawHyperCritical) : 0;
    const rawSpecialCritical = chance / 100;
    const specialCritical =
      specialCritSetting && chance >= 100 ? Math.ceil(rawSpecialCritical) : 0;

    const rawCrit = Math.max(1, chance / 20);
    const critical = Math.ceil(rawCrit);
    const rawSpecial = chance / 5;
    const special = Math.ceil(rawSpecial);
    const rawFumble = Math.min(100, 100 - (100 - chance) / 20);
    const fumble = Math.ceil(rawFumble);
    const limitedChance = Math.min(95, chance);
    const fail = Math.min(96, fumble - 1);
    let lookup = [
      { limit: hyperCritical, result: ResultEnum.HyperCritical },
      { limit: specialCritical, result: ResultEnum.SpecialCritical },
      { limit: critical, result: ResultEnum.Critical },
      { limit: special, result: ResultEnum.Special },
      { limit: limitedChance, result: ResultEnum.Success },
      { limit: fail, result: ResultEnum.Failure },
      { limit: Infinity, result: ResultEnum.Fumble },
    ];
    return lookup.filter((v) => roll <= v.limit)[0].result;
  }
}

export const emptyAbility = new Ability();
