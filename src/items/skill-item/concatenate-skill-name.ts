export function concatenateSkillName(skillName: string, specialization?: string): string {
  const specializationAddition = specialization ? ` (${specialization})` : "";
  return skillName + specializationAddition;
}
