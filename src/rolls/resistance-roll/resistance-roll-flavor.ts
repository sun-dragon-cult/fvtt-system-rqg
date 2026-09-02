import { localize } from "../../system/util";

/** Shared flavor markup for a resistance roll and a resistance-request card. */
export function buildResistanceRollFlavor(
  activeLabel: string,
  passiveLabel: string,
  opposingActorName?: string,
  description?: string,
): string {
  const resistanceTranslation = localize("RQG.Roll.ResistanceRoll.Title");
  const opposesLine = opposingActorName
    ? `<span>${localize("RQG.Roll.ResistanceRoll.Opposes", { targetName: `<b>${opposingActorName}</b>` })}</span><br>`
    : "";
  const descriptionLine = description
    ? `<span class="roll-action">${foundry.utils.escapeHTML(description)}</span><br>`
    : "";
  return `${descriptionLine}${opposesLine}<span class="roll-action">${activeLabel} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${passiveLabel}</span>
          <span>${resistanceTranslation}</span><br>`;
}
