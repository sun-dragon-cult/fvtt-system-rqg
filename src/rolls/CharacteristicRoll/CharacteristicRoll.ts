import { activateChatTab, isTruthy, localize, toSignedString } from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { calculateAbilitySuccessLevel } from "../AbilityRoll/calculateAbilitySuccessLevel";
import { AbilitySuccessLevelEnum } from "../AbilityRoll/AbilityRoll.defs";
import type { CharacteristicRollOptions } from "./CharacteristicRoll.types.ts";
import { DEFAULT_DIFFICULTY } from "./CharacteristicRoll.types.ts";

import Roll = foundry.dice.Roll;

export class CharacteristicRoll extends Roll {
  declare options: CharacteristicRollOptions;

  public static async rollAndShow(options: CharacteristicRollOptions) {
    const roll = new CharacteristicRoll(undefined, {}, options);
    await roll.evaluate();
    activateChatTab();
    const msg = await roll.toMessage({ flavor: roll.flavor, speaker: options.speaker }, {
      messageMode: options.rollMode,
      create: true,
    } as unknown as Record<string, unknown>);

    if (msg?.id != null) {
      await game.dice3d?.waitFor3DAnimationByMessageID(msg.id);
    }
    return roll;
  }

  constructor(
    formula: string = "1d100",
    data: Record<string, never> = {},
    options?: CharacteristicRollOptions,
  ) {
    super(formula, data, options);
  }

  get isEvaluated(): boolean {
    return this._evaluated;
  }

  get targetChance(): number {
    const modificationsSum =
      this.options?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    return Math.ceil(
      Math.max(
        0,
        this.options.characteristicValue! * (this.options.difficulty ?? DEFAULT_DIFFICULTY) +
          modificationsSum,
      ),
    ); // -50% => 0% to make the calculations work;
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total == null) {
      return undefined;
    }
    return calculateAbilitySuccessLevel(this.targetChance, this.total);
  }

  // Html for the "content" of the chat-message
  override async render({ flavor = this.flavor, isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : flavor,
      user: game.user!.id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
      target: isPrivate ? undefined : this.targetChance,
      successLevel: isPrivate ? "private" : this.successLevel,
      successLevelText: isPrivate
        ? undefined
        : localize(`RQG.Game.AbilityResultEnum.${this.successLevel}`),
      speakerUuid: ChatMessage.getSpeakerActor(this.options.speaker)?.uuid, // Used for hiding parts
    };
    return foundry.applications.handlebars.renderTemplate(
      templatePaths.characteristicRoll,
      chatData,
    );
  }

  // Html for what modifiers are applied
  override async getTooltip(): Promise<string> {
    const modifiers = this.options.modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = toSignedString(m.value);
        return m;
      });
    return foundry.applications.handlebars.renderTemplate(templatePaths.characteristicRollTooltip, {
      characteristicName: localize(`RQG.Actor.Characteristics.${this.options.characteristicName}`),
      characteristicValue: this.options.characteristicValue,
      difficulty: this.options.difficulty ?? DEFAULT_DIFFICULTY,
      difficultyName: this.getDifficultyName(this.options.difficulty ?? DEFAULT_DIFFICULTY),
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(this.options.speaker)?.uuid, // Used for hiding parts
    });
  }

  // Html for what characteristic the roll is about
  get flavor(): string {
    const characteristicName = localize(
      `RQG.Actor.Characteristics.${this.options.characteristicName}-full`,
    );
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
