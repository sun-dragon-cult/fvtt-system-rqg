import { RqgActor } from "../../actors/rqgActor";

export interface IAbility {
  chance?: number;
  canGetExperience: boolean;
  hasExperience?: boolean;
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

export class Ability {
  // Do a roll against this ability and factor in all modifiers.
  // stat - an object that implements IAbility
  // chanceMod - a +/- value that changes the chance
  public static async roll(
    actor: RqgActor,
    chance: number,
    chanceMod: number, // TODO supply full EffectModifier so it's possible to show "Broadsword (Bladesharp +10%, Darkness -70%) Fumble"
    flavor: string // TODO Rename to ability?
  ): Promise<ResultEnum> {
    const r = new Roll("1D100");
    r.roll();
    const modifiedChance: number = chance + chanceMod;
    const result = Ability.evaluateResult(modifiedChance, r.total);
    const sign = chanceMod > 0 ? "+" : "";
    const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
    const resultText = game.i18n.localize(`ResultEnum.${result}`);
    await r.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `${flavor} (${chance}${chanceModText}%) ${resultText}`,
    });
    return result;
  }

  private static evaluateResult(chance: number, roll: number): ResultEnum {
    const specialCritSetting = game.settings.get("rqg", "specialCrit");

    const hyperCritical = specialCritSetting && chance >= 100 ? Math.ceil(chance / 500) : 0;
    const specialCritical = specialCritSetting && chance >= 100 ? Math.ceil(chance / 100) : 0;

    const critical = Math.ceil(Math.max(1, chance / 20));
    const special = Math.ceil(chance / 5);
    const fumble = Math.ceil(Math.min(100, 100 - (100 - chance) / 20));
    const success = Math.min(95, Math.max(chance, 5));
    const fail = Math.min(96, fumble - 1);
    let lookup = [
      { limit: hyperCritical, result: ResultEnum.HyperCritical },
      { limit: specialCritical, result: ResultEnum.SpecialCritical },
      { limit: critical, result: ResultEnum.Critical },
      { limit: special, result: ResultEnum.Special },
      { limit: success, result: ResultEnum.Success },
      { limit: fail, result: ResultEnum.Failure },
      { limit: Infinity, result: ResultEnum.Fumble },
    ];
    return lookup.filter((v) => roll <= v.limit)[0].result;
  }
}
