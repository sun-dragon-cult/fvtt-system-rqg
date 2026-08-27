import { localize } from "../../system/util";

/**
 * The "opposes X" / "active vs passive" / "Resistance Roll" header markup, shared between an
 * actual ResistanceRoll's flavor and a resistance-request chat card's flavor, so both look the
 * same whether the roll happened directly or via a GM request.
 */
export function buildResistanceRollFlavor(
  activeLabel: string,
  passiveLabel: string,
  passiveActorName?: string,
): string {
  const resistanceTranslation = localize("RQG.Roll.ResistanceRoll.Title");
  const opposesLine = passiveActorName
    ? `<span>${localize("RQG.Roll.ResistanceRoll.Opposes", { targetName: `<b>${passiveActorName}</b>` })}</span><br>`
    : "";
  return `${opposesLine}<span class="roll-action">${activeLabel} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${passiveLabel}</span>
          <span>${resistanceTranslation}</span><br>`;
}
