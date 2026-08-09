import { templatePaths } from "../../system/load-handlebars-templates";
import { formatRollFormulaHtml } from "../../system/util";
import type { AnyObject, EmptyObject } from "fvtt-types/utils";

import Roll = foundry.dice.Roll;
/**
 * DamageRoll is only displayed as part of the CombatChatMessage,
 * so no "rollAndShow" or flavor is needed.
 */
export class DamageRoll<D extends AnyObject = EmptyObject> extends Roll<D> {
  constructor(formula: string, data?: D, options?: Roll.Options) {
    super(formula, data, options);
  }

  get isEvaluated(): boolean {
    return this._evaluated;
  }

  // Html for the "content" of the chat-message
  override async render({ isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const chatData = {
      user: game.user!.id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
    };
    return foundry.applications.handlebars.renderTemplate(templatePaths.damageRoll, chatData);
  }

  override get total(): number {
    const superTotal = super.total;
    return Math.max(0, superTotal ?? 0); // Damage can't be negative
  }

  get originalFormula(): string {
    return this._formula;
  }

  // Html for the details of how much damage was rolled
  override async getTooltip(): Promise<string> {
    const parts = this.dice.map((d) => d.getTooltipData());

    return foundry.applications.handlebars.renderTemplate(templatePaths.damageRollTooltip, {
      parts,
      formulaHtml: formatRollFormulaHtml(this._formula),
    });
  }
}
