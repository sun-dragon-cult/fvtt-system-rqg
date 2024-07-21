export type AbilityType = "passion" | "skill" | "rune";

export type AbilityImprovementData = {
  abilityType: AbilityType;
  typeLocName: string; // Translated item type
  name: string; // name of item
  showExperience: boolean;
  showTraining: boolean;
  img: string | null;
  chance: number;
  chanceToGain: number;
  categoryMod?: number;
  skillOver75?: boolean;
  experienceGainFixed: number;
  experienceGainRandom: string;
  trainingGainFixed: number;
  trainingGainRandom: string;
};
