import { getGame } from "../../system/util";

export interface IAbility {
  /** The effective % chance of this ability with all modifiers added in */
  chance?: number;
  /** Is it possible to learn this ability by doing (setting hasExperience=true)? Otherwise the only way to increase the learned chance is by study */
  canGetExperience: boolean;
  /** Has this ability been successfully used and therefore up for an improvement roll */
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

export class ResultMessage {
  result!: ResultEnum;
  html!: string;
}

export class Ability {
  /** Do a roll against this ability and factor in all modifiers.
   * stat - an object that implements IAbility
   * chanceMod - a +/- value that changes the chance
   **/
  public static async roll(
    flavor: string,
    chance: number,
    chanceMod: number, // TODO supply full EffectModifier so it's possible to show "Broadsword (Bladesharp +10%, Darkness -70%) Fumble"
    speakerName: string,
    resultMessages?: ResultMessage[],
  ): Promise<ResultEnum> {
    const r = new Roll("1d100");
    await r.evaluate({ async: true });
    const modifiedChance: number = chance + chanceMod;
    const useSpecialCriticals = getGame().settings.get("rqg", "specialCrit");
    const result = Ability.evaluateResult(modifiedChance, r.total!, useSpecialCriticals);
    let resultMsgHtml: string | undefined = "";
    if (resultMessages) {
      resultMsgHtml = resultMessages.find(i => i.result === result)?.html;
    }
    const sign = chanceMod > 0 ? "+" : "";
    const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
    const resultText = getGame().i18n.localize(`RQG.Game.ResultEnum.${result}`);
    await r.toMessage({
      flavor: `${flavor} (${chance}${chanceModText}%) <h1>${resultText}</h1><div>${resultMsgHtml}</div>`,
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    });
    return result;
  }

  private static evaluateResult(
    chance: number,
    roll: number,
    useSpecialCriticals: boolean
  ): ResultEnum {
    chance = Math.max(0, chance); // -50% = 0%

    const hyperCritical = useSpecialCriticals && chance >= 100 ? Math.ceil(chance / 500) : 0;
    const specialCritical = useSpecialCriticals && chance >= 100 ? Math.ceil(chance / 100) : 0;

    const critical = Math.max(1, Math.ceil((chance - 29) / 20) + 1);
    const special =
      chance === 6 || chance === 7 ? 2 : Math.min(95, Math.max(1, Math.ceil((chance - 7) / 5) + 1));
    const fumble = Math.min(100, 100 - Math.ceil((100 - chance - 9) / 20) + 1);
    const success = Math.min(95, Math.max(chance, 5));
    const fail = fumble === 96 ? 95 : Math.max(96, fumble - 1);
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
