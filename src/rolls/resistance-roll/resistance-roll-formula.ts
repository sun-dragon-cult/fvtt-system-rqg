/** The resistance-table formula (p.145-147): active vs passive + modifiers, as a d100 target%. */
export function computeResistanceTargetChance(
  activeValue: number,
  passiveValue: number,
  modifierValues: number[] = [],
): number {
  const modifiersSum = modifierValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
  return Math.ceil(50 + (activeValue - passiveValue) * 5 + modifiersSum);
}
