import { Attributes, emptyAttributes } from "./attributes";
import { Characteristics, emptyCharacteristics } from "./characteristics";
import { Background, emptyBackground } from "./background";
import { emptySkillCategories, SkillCategories } from "./skillCategories";

export class RqgActorData {
  constructor(
    public characteristics: Characteristics,
    public background: Background,
    public allies: string, // Editor text with links to allies and general notes
    // --- Derived / Convenience Data Below ---
    public attributes: Attributes, // Most are derived
    public skillCategoryModifiers?: SkillCategories
  ) {}
}

export const emptyActorDataRqg: RqgActorData = new RqgActorData(
  emptyCharacteristics,
  emptyBackground,
  "",
  emptyAttributes, // Needs to be persisted?
  emptySkillCategories // Needs to be persisted?
);
