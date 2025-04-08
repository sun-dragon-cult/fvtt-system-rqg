import { getGameUser } from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

/**
 * DamageRoll is only displayed as part of the CombatChatMessage,
 * so no "rollAndShow" or flavor is needed.
 */
export class DamageRoll extends Roll {
  constructor(formula: string, data: any = {}, options: any = {}) {
    super(formula, data, options);
  }

  // Html for the "content" of the chat-message
  async render({ isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const chatData = {
      user: getGameUser().id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
    };
    return renderTemplate(templatePaths.damageRoll, chatData);
  }

  get total(): number {
    const superTotal = super.total;
    return Math.max(0, superTotal ?? 0); // Damage can't be negative
  }

  get originalFormula(): string {
    return this._formula;
  }

  // Html for the details of how much damage was rolled
  async getTooltip(): Promise<string> {
    const parts = this.dice.map((d) => d.getTooltipData());

    return renderTemplate(templatePaths.damageRollTooltip, {
      parts,
      formulaHtml: this._formula
        .replaceAll(" ", "&nbsp;") // Prevent linebreaks
        .replaceAll("[", "</b><sub>&nbsp;")
        .replaceAll("]", "</sub><b> ") // Include a regular linebreak to allow for linebreaks here
        .replaceAll("-", "&#8209;"), // non-breaking minus sign
    });
  }
}
