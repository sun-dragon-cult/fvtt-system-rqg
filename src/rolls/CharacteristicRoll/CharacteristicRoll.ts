import { activateChatTab, getGameUser, isTruthy, localize } from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { calculateAbilitySuccessLevel } from "../AbilityRoll/calculateAbilitySuccessLevel";
import { AbilitySuccessLevelEnum } from "../AbilityRoll/AbilityRoll.defs";
import { CharacteristicRollOptions } from "./CharacteristicRoll.types";

export class CharacteristicRoll extends Roll {
  public static async rollAndShow(options: CharacteristicRollOptions) {
    const roll = new CharacteristicRoll(undefined, {}, options);
    await roll.evaluate();
    activateChatTab();
    const msg = await roll.toMessage(
      { flavor: roll.flavor, speaker: options.speaker },
      { rollMode: options.rollMode, create: true },
    );
    // @ts-expect-error Dice3D (Dice So Nice)
    await game.dice3d?.waitFor3DAnimationByMessageID(msg.id);
    return roll;
  }

  constructor(formula: string = "1d100", data: any, options: CharacteristicRollOptions) {
    super(formula, data, options);
  }

  get targetChance(): number {
    const o = this.options as CharacteristicRollOptions;
    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    return Math.ceil(Math.max(0, o.characteristicValue! * (o.difficulty ?? 5) + modificationsSum)); // -50% => 0% to make the calculations work;
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total == null) {
      return undefined;
    }
    return calculateAbilitySuccessLevel(this.targetChance, this.total);
  }

  // Html for the "content" of the chat-message
  async render({ flavor = this.flavor, isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const o = this.options as CharacteristicRollOptions;
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : flavor,
      user: getGameUser().id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
      target: isPrivate ? undefined : this.targetChance,
      successLevel: isPrivate ? "private" : this.successLevel,
      successLevelText: isPrivate
        ? undefined
        : localize(`RQG.Game.AbilityResultEnum.${this.successLevel}`),
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid, // Used for hiding parts
    };
    return renderTemplate(templatePaths.characteristicRoll, chatData);
  }

  // Html for what modifiers are applied
  async getTooltip(): Promise<string> {
    const modifiers = (this.options as CharacteristicRollOptions).modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = m.value.signedString();
        return m;
      });
    const o = this.options as CharacteristicRollOptions;
    return renderTemplate(templatePaths.characteristicRollTooltip, {
      characteristicName: localize(`RQG.Actor.Characteristics.${o.characteristicName}`),
      characteristicValue: o.characteristicValue,
      difficulty: o.difficulty ?? 5,
      difficultyName: this.getDifficultyName(o.difficulty ?? 5),
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid, // Used for hiding parts
    });
  }

  // Html for what characteristic the roll is about
  get flavor(): string {
    const o = this.options as CharacteristicRollOptions;
    const characteristicName = localize(`RQG.Actor.Characteristics.${o.characteristicName}-full`);
    const characteristicTranslation = localize("RQG.Actor.Characteristics.Characteristic");
    return `<span class="roll-action">${characteristicName}</span>
            <span>${characteristicTranslation}</span><br>`;
  }

  private getDifficultyName(difficulty: number): string {
    const translationKeyDifficulty = difficulty === 0.5 ? 0 : difficulty;
    const translation = localize(
      `RQG.Roll.CharacteristicRoll.RollDifficultyLevel.${translationKeyDifficulty}`,
    );
    if (translation.startsWith("RQG.Roll.CharacteristicRoll.RollDifficultyLevel.")) {
      return localize("RQG.Roll.CharacteristicRoll.Other");
    }
    return translation;
  }
}
