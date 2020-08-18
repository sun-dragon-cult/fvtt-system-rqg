import { Attributes, emptyAttributes } from "./attributes";
import {
  Characteristics,
  emptyHumanoidCharacteristics,
} from "./characteristics";
import { RaceEnum } from "./race";
import { emptyHumanoidHitLocations, HitLocations } from "./hitLocation";
import { Background, emptyBackground } from "./background";
import { emptySkillCategories, SkillCategories } from "./skillCategories";

export class RqgActorData {
  constructor(
    public characteristics: Characteristics,
    public hitLocations: HitLocations, // Different races can have different hit locations
    public attributes: Attributes,
    public background: Background,
    public skillCategoryModifiers?: SkillCategories,
    public race: RaceEnum = RaceEnum.Humanoid,
    public runeIcons?: any, // Convenience added by ActorSheet.prepareData
    public occupations?: any, // Convenience added by ActorSheet.prepareData
    public homelands?: any, // Convenience added by ActorSheet.prepareData
    public itemGroups?: any // Convenience added by ActorSheet.prepareData
  ) {}
}

export const emptyActorDataRqg: RqgActorData = new RqgActorData(
  emptyHumanoidCharacteristics,
  emptyHumanoidHitLocations,
  emptyAttributes,
  emptyBackground,
  emptySkillCategories
);
