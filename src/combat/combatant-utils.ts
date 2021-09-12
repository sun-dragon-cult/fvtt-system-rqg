import { requireValue } from "../system/util";

export function getCombatantsSharingToken(combatant: Combatant): any {
  requireValue(combatant.actor, "Combatant didn't have actor", combatant);
  requireValue(combatant.parent, "Combatant didn't have parent", combatant);

  const combatantTokenIds = combatant.actor
    .getActiveTokens(false, true)
    .map((t: TokenDocument) => t.id);
  return combatant.parent.combatants.filter((cb: any) =>
    combatantTokenIds.includes(cb.data.tokenId)
  );
}
