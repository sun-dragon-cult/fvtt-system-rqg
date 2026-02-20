import {
  activateChatTab,
  isTruthy,
  localize,
  localizeItemType,
  toSignedString,
} from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { calculateAbilitySuccessLevel } from "../AbilityRoll/calculateAbilitySuccessLevel";
import { AbilitySuccessLevelEnum } from "../AbilityRoll/AbilityRoll.defs";
import type { SpiritMagicRollOptions } from "./SpiritMagicRoll.types";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";

import Roll = foundry.dice.Roll;

export class SpiritMagicRoll extends Roll {
  public static async rollAndShow(options: SpiritMagicRollOptions) {
    const roll = new SpiritMagicRoll(undefined, {}, options);
    await roll.evaluate();
    activateChatTab();
    const msg = await roll.toMessage(
      { flavor: roll.flavor, speaker: options.speaker },
      { rollMode: options.rollMode, create: true },
    );
    if (msg?.id != null) {
      await game.dice3d?.waitFor3DAnimationByMessageID(msg.id);
    }
    return roll;
  }

  constructor(formula: string = "1d100", data: any, options: SpiritMagicRollOptions) {
    super(formula, data, options);
  }

  get isEvaluated(): boolean {
    return this._evaluated;
  }

  get targetChance(): number {
    const o = this.options as SpiritMagicRollOptions;
    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    return Math.max(0, (o.powX5 ?? 0) + modificationsSum); // -50% => 0% to make the calculations work;
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
    const o = this.options as SpiritMagicRollOptions;
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
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid, // Used for hiding parts
    };
    return foundry.applications.handlebars.renderTemplate(templatePaths.spiritMagicRoll, chatData);
  }

  // Html for what modifiers are applied and how many mp are used
  override async getTooltip(): Promise<string> {
    const modifiers = (this.options as SpiritMagicRollOptions).modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = toSignedString(m.value);
        return m;
      });
    const o = this.options as SpiritMagicRollOptions;
    const mpCost = o.levelUsed + (o.magicPointBoost ?? 0);
    const mpDrawn = this.successLevel! <= AbilitySuccessLevelEnum.Success ? mpCost : 0;
    return foundry.applications.handlebars.renderTemplate(templatePaths.spiritMagicRollTooltip, {
      magicPointCostText: localize("RQG.Roll.SpiritMagicRoll.MagicPointCost", {
        cost: mpDrawn.toString(),
      }),
      powX5: o.powX5,
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid,
    });
  }

  // Html for what Spirit Magic the roll is about
  get flavor(): string {
    const o = this.options as SpiritMagicRollOptions;
    const spellName = o.spellName;
    const flavorImg = o.spellImg ? `<img src="${o.spellImg}">` : "";
    const itemType = localizeItemType(ItemTypeEnum.SpiritMagic);
    const level = o.levelUsed;
    return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${spellName} <span class="roll-level">${level}</span></span>
<span>${itemType}</span><br>`;
  }
}
