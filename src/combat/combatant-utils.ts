export function getCombatantsSharingToken(combatant: any): any {
  // @ts-ignore
  const combatantTokenIds = combatant.actor.getActiveTokens(false, true).map((t) => t.id);
  return combatant.parent.combatants.filter((cb: any) =>
    combatantTokenIds.includes(cb.data.tokenId)
  );
}
