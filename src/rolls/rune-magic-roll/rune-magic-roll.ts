import {
  activateChatTab,
  isTruthy,
  localize,
  localizeItemType,
  toSignedString,
} from "../../system/util";
import { templatePaths } from "../../system/load-handlebars-templates";
import { calculateAbilitySuccessLevel } from "../ability-roll/calculate-ability-success-level";
import { AbilitySuccessLevelEnum } from "../ability-roll/ability-roll.defs";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { RuneMagicDataModel } from "@item-model/rune-magic-data-model.ts";
import type { RuneMagicRollOptions } from "./rune-magic-roll.types";

import Roll = foundry.dice.Roll;

export class RuneMagicRoll extends Roll {
  declare options: RuneMagicRollOptions;

  public static async rollAndShow(options: RuneMagicRollOptions) {
    const roll = new RuneMagicRoll(undefined, {}, options);
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
    options?: RuneMagicRollOptions,
  ) {
    super(formula, data, options);
  }

  get isEvaluated(): boolean {
    return this._evaluated;
  }

  get targetChance(): number {
    return RuneMagicDataModel.calculateCastChanceFromBaseChance(
      this.options.usedRuneChance,
      this.options.modifiers ?? [],
    );
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
    return foundry.applications.handlebars.renderTemplate(templatePaths.runeMagicRoll, chatData);
  }

  // Html for what modifiers are applied and how many mp are used
  override async getTooltip(): Promise<string> {
    const modifiers = this.options.modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => ({ ...m, value: toSignedString(Number(m.value)) }));
    const cost = RuneMagicDataModel.calculatePointCosts(
      this.successLevel ?? 0,
      this.options.levelUsed,
      this.options.magicPointBoost,
    );
    const isOneUse = this.options.isOneUse;
    const usageCostText = isOneUse
      ? localize("RQG.Roll.RuneMagicRoll.OneUseUsageCost", {
          runePointsCost: cost.rp.toString(),
          magicPointCost: cost.mp.toString(),
        })
      : localize("RQG.Roll.RuneMagicRoll.UsageCost", {
          runePointsCost: cost.rp.toString(),
          magicPointCost: cost.mp.toString(),
        });

    return foundry.applications.handlebars.renderTemplate(templatePaths.runeMagicRollTooltip, {
      usageCostText: usageCostText,
      usedRuneChance: Number(this.options.usedRuneChance ?? 0),
      usedRuneName: this.options.usedRuneName,
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(this.options.speaker)?.uuid,
    });
  }

  // Html for what Rune Magic the roll is about
  get flavor(): string {
    const spellName = this.options.spellName;
    const flavorImg = this.options.spellImg ? `<img src="${this.options.spellImg}">` : "";
    const itemType = localizeItemType(ItemTypeEnum.RuneMagic);
    const level = this.options.levelUsed;
    return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${spellName} <span class="roll-level">${level}</span></span>
<span>${itemType}</span><br>`;
  }
}
