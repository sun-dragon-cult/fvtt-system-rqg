import { activateChatTab, isTruthy, localize, toSignedString } from "../../system/util";
import { templatePaths } from "../../system/load-handlebars-templates";
import { calculateAbilitySuccessLevel } from "../ability-roll/calculate-ability-success-level";
import { AbilitySuccessLevelEnum } from "../ability-roll/ability-roll.defs";
import type { ResistanceRollOptions } from "./resistance-roll.types.ts";
import { buildResistanceRollFlavor } from "./resistance-roll-flavor.ts";
import { computeResistanceTargetChance } from "./resistance-roll-formula.ts";
import type { AnyObject, EmptyObject } from "fvtt-types/utils";

import Roll = foundry.dice.Roll;

/**
 * A roll on the Resistance Table (RQG core rulebook p.145-147): active vs passive characteristic
 * (or sum of characteristics) folded into a single d100 target%, resolved with the same
 * success-band mechanic as skill/characteristic rolls.
 */
export class ResistanceRoll<D extends AnyObject = EmptyObject> extends Roll<D> {
  declare options: ResistanceRollOptions;

  public static async rollAndShow(options: ResistanceRollOptions) {
    const roll = new ResistanceRoll(undefined, {}, options);
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

  constructor(formula: string = "1d100", data?: D, options?: ResistanceRollOptions) {
    super(formula, data, options);
  }

  get isEvaluated(): boolean {
    return this._evaluated;
  }

  get targetChance(): number {
    const modifierValues = this.options?.modifiers?.map((mod) => mod?.value) ?? [];
    return computeResistanceTargetChance(
      this.options.activeValue,
      this.options.passiveValue,
      modifierValues,
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
    return foundry.applications.handlebars.renderTemplate(templatePaths.resistanceRoll, chatData);
  }

  // Html for what modifiers are applied
  override async getTooltip(): Promise<string> {
    const modifiers = this.options.modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m) => ({ ...m, value: toSignedString(Number(m.value)) }));
    return foundry.applications.handlebars.renderTemplate(templatePaths.resistanceRollTooltip, {
      activeLabel: this.options.activeLabel,
      activeValue: this.options.activeValue,
      passiveLabel: this.options.passiveLabel,
      passiveValue: this.options.passiveValue,
      modifiers: nonzeroSignedModifiers,
      speakerUuid: ChatMessage.getSpeakerActor(this.options.speaker)?.uuid, // Used for hiding parts
    });
  }

  // Html for what the roll is about. A small "opposes <name>" line (mirroring the attack chat
  // card's "attacks <name>") comes first when the passive side came from a targeted actor, then
  // the bold "active vs passive" header naming the characteristic(s) rolled.
  get flavor(): string {
    return buildResistanceRollFlavor(
      this.options.activeLabel,
      this.options.passiveLabel,
      this.options.passiveActorName,
    );
  }
}
