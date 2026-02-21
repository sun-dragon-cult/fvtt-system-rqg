export function getCombatantsSharingToken(combatant: Combatant.Stored | undefined): Combatant[] {
  if (combatant?.actor == null || combatant.parent == null) {
    return [];
  }

  // @ts-expect-error sceneId
  const scene = game.scenes?.get(combatant.sceneId);

  const combatantTokenIds = combatant.actor
    .getDependentTokens({ scenes: scene })
    .map((t: TokenDocument) => t.id);
  return combatant.parent.combatants.filter((cb: any) => combatantTokenIds.includes(cb.tokenId));
}

/**
 * Returns what SR are missing a combatant, looking at activeSr
 */
export function getSrWithoutCombatants(combatants: Combatant[], activeSr: Set<number>): number[] {
  return [...activeSr].filter((sr) => !combatants.some((c) => c.initiative === sr));
}

/**
 * Returns what combatant ids to delete, looking at the activeSr list. Handles combatants with same SR etc.
 * If no SR are selected in activeSr, then keep the first combatant to not remove the token from combat.
 */
export function getCombatantIdsToDelete(combatants: Combatant[], activeSr: Set<number>): string[] {
  // If no SR are selected, keep one combatant to keep the token in the combat tracker. The SR should be set to null in this case
  const keepOneCombatant = activeSr.size === 0;
  if (keepOneCombatant) {
    return combatants.slice(1).map((c) => c.id ?? "");
  }

  const seenSr = new Set<number | null>();
  const duplicateCombatants: Combatant[] = [];
  const nonDuplicateCombatants = combatants.filter((c) => {
    const isDuplicate = seenSr.has(c.initiative);
    seenSr.add(c.initiative);
    if (isDuplicate) {
      duplicateCombatants.push(c);
      return false;
    }
    return true;
  });
  const extraSr = nonDuplicateCombatants.filter((c) => !activeSr.has(c.initiative ?? -1));
  return [...duplicateCombatants, ...extraSr].map((c) => c.id ?? "");
}
