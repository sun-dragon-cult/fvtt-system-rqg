import { Attributes, emptyAttributes } from "./attributes";
import { Characteristics, emptyCharacteristics } from "./characteristics";
import { RaceEnum } from "./race";
import { Background, emptyBackground } from "./background";
import { emptySkillCategories, SkillCategories } from "./skillCategories";

export class RqgActorData {
  constructor(
    public characteristics: Characteristics,
    public attributes: Attributes,
    public background: Background,
    public skillCategoryModifiers?: SkillCategories,
    public race: RaceEnum = RaceEnum.Humanoid,
    public occupations?: any, // Convenience added by ActorSheet.prepareData
    public homelands?: any, // Convenience added by ActorSheet.prepareData
    public itemGroups?: any // Convenience added by ActorSheet.prepareData
  ) {}
}

export const emptyActorDataRqg: RqgActorData = new RqgActorData(
  emptyCharacteristics,
  emptyAttributes,
  emptyBackground,
  emptySkillCategories
);
