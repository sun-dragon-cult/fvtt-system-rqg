import { calculateAbilitySuccessLevel } from "./calculateAbilitySuccessLevel";
import {
  activateChatTab,
  isTruthy,
  localize,
  localizeItemType,
  toSignedString,
} from "../../system/util";
import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { AbilityRollOptions } from "./AbilityRoll.types";

export class AbilityRoll extends Roll<AbilityRollOptions> {
  // TODO hur deklarerar jag att options är AbilityRollOptions ???
  //   declare options: AbilityRollOptions;

  public static async rollAndShow(options: AbilityRollOptions) {
    const roll = new AbilityRoll(undefined, {}, options);
    await roll.evaluate();
    activateChatTab();
    const msg = await roll.toMessage(
      { flavor: roll.flavor, speaker: options.speaker },
      { rollMode: options.rollMode, create: true },
    );
    // @ts-expect-error Dice3D (Dice So Nice) TODO should work - investigate
    await game.dice3d?.waitFor3DAnimationByMessageID(msg?.id);
    return roll;
  }

  constructor(formula: string = "1d100", data: any, options: AbilityRollOptions) {
    super(formula, data, options);
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total == null) {
      return undefined;
    }
    return calculateAbilitySuccessLevel(this.targetChance, this.total);
  }

  get targetChance(): number {
    const o = this.options; //TODO fix type as AbilityRollOptions;
    const modificationsSum =
      o?.modifiers?.reduce((acc: number, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    return Math.max(0, o.naturalSkill! + modificationsSum); // -50% => 0% to make the calculations work;
  }

  // Html for the "content" of the chat-message
  override async render({ flavor = this.flavor, isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const o = this.options as AbilityRollOptions;
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : flavor,
      user: game.user!.id,
      heading: o?.heading,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
      target: isPrivate ? undefined : this.targetChance,
      successLevel: isPrivate ? "private" : this.successLevel,
      successLevelText: isPrivate
        ? undefined
        : localize(`RQG.Game.AbilityResultEnum.${this.successLevel}`),
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid, // Used for hiding parts
    };
    return foundry.applications.handlebars.renderTemplate(templatePaths.abilityRoll, chatData);
  }

  // Html for what modifiers are applied
  override async getTooltip(): Promise<string> {
    const o = this.options as AbilityRollOptions;
    const modifiers = o.modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = toSignedString(m.value);
        return m;
      });
    return foundry.applications.handlebars.renderTemplate(templatePaths.abilityRollTooltip, {
      naturalSkill: (this.options as AbilityRollOptions).naturalSkill,
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid,
    });
  }

  // Html for what ability the roll is about
  get flavor(): string {
    const o = this.options as AbilityRollOptions;
    const resultMsgHtml = o.resultMessages?.get(this.successLevel) ?? "";
    const flavorImg = o.abilityImg ? `<img src="${o.abilityImg}">` : "";
    const itemType = o.abilityType ? localizeItemType(o.abilityType) : "";
    return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${o.abilityName ?? ""}</span>
<span>${itemType}</span><br>
<div>${resultMsgHtml}</div>`;
  }
}
