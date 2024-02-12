import type { AbilityRollOptions } from "./AbilityRoll.types";
import { calculateAbilitySuccessLevel } from "./calculateAbilitySuccessLevel";
import { activateChatTab, localize, localizeItemType } from "../../system/util";
import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";

export class AbilityRoll extends Roll {
  _targetChance = 0; // Target value including any modifiers

  constructor(options: AbilityRollOptions) {
    super("1d100", {}, options);
    const o = this.options as AbilityRollOptions;

    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    this._targetChance = Math.max(0, o.naturalSkill! + modificationsSum); // -50% => 0% to make the calculations work
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total === undefined) {
      return undefined;
    }
    const useSpecialCriticals = (this.options as AbilityRollOptions).useSpecialCriticals ?? false;
    return calculateAbilitySuccessLevel(this._targetChance, this.total, useSpecialCriticals);
  }

  get modifiersTextLong(): string {
    const modifiers = (this.options as AbilityRollOptions).modifiers ?? [];
    return (
      `<b>${(this.options as AbilityRollOptions).naturalSkill}</b><sub><i>base</i></sub> ` +
      modifiers.reduce(
        (acc, mod) =>
          mod?.value
            ? `${acc} <b>${mod.value.signedString()}</b><sub><i>${mod.description}</i></sub>`
            : acc,
        "",
      )
    );
  }

  toMessage(...props: any): Promise<any> {
    activateChatTab();
    return super.toMessage(...props);
  }

  get flavor(): string {
    const o = this.options as AbilityRollOptions;
    const resultMsgHtml = o.resultMessages?.get(this.successLevel) ?? "";
    return `
<div class="rqg flavor">
  <img src="icons/dice/d10black.svg" style="mix-blend-mode:soft-light;top:-0.5rem;right:-6rem;height:4rem;pointer-events:none;">
  <img src="${o.abilityImg ?? ""}">
</div>
<span class="large-font">${o.abilityName ?? ""}</span>
<span>${o.abilityType ? localizeItemType(o.abilityType) : ""}</span><br>
<b class="large-font">Target ${this._targetChance}%</b>
<span>⇐ ${this.modifiersTextLong}</span>

<h1>${localize(`RQG.Game.AbilityResultEnum.${this.successLevel}`)}</h1><div>${resultMsgHtml}</div>`;
  }
}
