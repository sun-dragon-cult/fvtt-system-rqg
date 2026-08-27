/**
 * The resistance-table formula (core rulebook p.145-147): active vs passive characteristic (or
 * sum of characteristics), plus any modifiers, folded into a single d100 target%. Shared by
 * `ResistanceRoll.targetChance` and every dialog's live target-% preview, so a future RAW tweak
 * only needs to change one place.
 */
export function computeResistanceTargetChance(
  activeValue: number,
  passiveValue: number,
  modifierValues: number[] = [],
): number {
  const modifiersSum = modifierValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
  return Math.ceil(50 + (activeValue - passiveValue) * 5 + modifiersSum);
}
