import {
  activateChatTab,
  getGameUser,
  isTruthy,
  localize,
  localizeItemType,
} from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { calculateAbilitySuccessLevel } from "../AbilityRoll/calculateAbilitySuccessLevel";
import { AbilitySuccessLevelEnum } from "../AbilityRoll/AbilityRoll.defs";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RuneMagicRollOptions } from "./RuneMagicRoll.types";
import { RuneMagic } from "../../items/rune-magic-item/runeMagic";

export class RuneMagicRoll extends Roll {
  public static async rollAndShow(options: RuneMagicRollOptions) {
    const roll = new RuneMagicRoll(undefined, {}, options);
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

  constructor(formula: string = "1d100", data: any, options: RuneMagicRollOptions) {
    super(formula, data, options);
  }

  get targetChance(): number {
    const o = this.options as RuneMagicRollOptions;
    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    return Math.max(0, (o.usedRune.system?.chance ?? 0) + modificationsSum); // -50% => 0% to make the calculations work;
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
    const o = this.options as RuneMagicRollOptions;
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
    // @ts-expect-error applications
    return foundry.applications.handlebars.renderTemplate(templatePaths.runeMagicRoll, chatData);
  }

  // Html for what modifiers are applied and how many mp are used
  async getTooltip(): Promise<string> {
    const modifiers = (this.options as RuneMagicRollOptions).modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = m.value.signedString();
        return m;
      });
    const o = this.options as RuneMagicRollOptions;
    const cost = RuneMagic.calcRuneAndMagicPointCost(
      this.successLevel ?? 0,
      o.levelUsed,
      o.magicPointBoost,
    );
    const usageCostText = o.runeMagicItem.system.isOneUse
      ? localize("RQG.Roll.RuneMagicRoll.OneUseUsageCost", {
          runePointsCost: cost.rp,
          magicPointCost: cost.mp,
        })
      : localize("RQG.Roll.RuneMagicRoll.UsageCost", {
          runePointsCost: cost.rp,
          magicPointCost: cost.mp,
        });

    // @ts-expect-error applications
    return foundry.applications.handlebars.renderTemplate(templatePaths.runeMagicRollTooltip, {
      usageCostText: usageCostText,
      usedRuneChance: o.usedRune.system.chance,
      usedRuneName: o.usedRune.name,
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid,
    });
  }

  // Html for what Rune Magic the roll is about
  get flavor(): string {
    const o = this.options as RuneMagicRollOptions;
    const spellName = o.runeMagicItem.name;
    const flavorImg = o.runeMagicItem.img ? `<img src="${o.runeMagicItem.img}">` : "";
    const itemType = localizeItemType(ItemTypeEnum.RuneMagic);
    const level = o.levelUsed;
    return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${spellName} <span class="roll-level">${level}</span></span>
<span>${itemType}</span><br>`;
  }
}
