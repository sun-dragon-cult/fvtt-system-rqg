import { Attributes, emptyAttributes } from "./attributes";
import {
  Characteristics,
  emptyHumanoidCharacteristics,
} from "./characteristics";
import { basicElementalRunes, ElementalRunes } from "./elementalRunes";
import { basicPowerRunes, PowerRunes } from "./powerRunes";
import { RaceEnum } from "./race";
import { emptyHumanoidHitLocations, HitLocations } from "./hitLocation";
import { Background, emptyBackground } from "./background";
import { Modifier } from "./modifier";

export class RqgActorData {
  constructor(
    public characteristics: Characteristics,
    public hitLocations: HitLocations, // Different races can have different hit locations
    public attributes: Attributes,
    public elements: ElementalRunes,
    public powers: PowerRunes,
    public background: Background,
    public skillCategoryModifiers?: Modifier[], // TODO Add values
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
  basicElementalRunes,
  basicPowerRunes,
  emptyBackground
);
