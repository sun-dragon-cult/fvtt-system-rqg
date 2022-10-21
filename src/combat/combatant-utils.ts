export function getCombatantsSharingToken(combatant: Combatant): any {
  if (combatant.actor == null || combatant.parent == null) {
    return [];
  }

  const combatantTokenIds = combatant.actor
    .getActiveTokens(false, true)
    .map((t: TokenDocument) => t.id);
  return combatant.parent.combatants.filter((cb: any) => combatantTokenIds.includes(cb.tokenId));
}
