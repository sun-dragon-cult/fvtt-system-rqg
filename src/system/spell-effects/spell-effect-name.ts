/** The name a cast gives its spell effect, e.g. "Bladesharp (4)". */
export function spellEffectName(spellName: string, level: number): string {
  return `${spellName} (${level})`;
}

/**
 * The effect's name after its level changes - undefined when the name no longer is the one a cast
 * gave it, so a GM's own name is kept.
 */
export function renameForSpellLevel(
  currentName: string,
  spell: { spellName: string; level: number },
  newLevel: number,
): string | undefined {
  return currentName === spellEffectName(spell.spellName, spell.level)
    ? spellEffectName(spell.spellName, newLevel)
    : undefined;
}
