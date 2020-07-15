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

export class ActorDataRqg {
  constructor(
    public characteristics: Characteristics,
    public hitLocations: HitLocations, // Different races can have different hit locations
    public attributes: Attributes,
    public elements: ElementalRunes,
    public powers: PowerRunes,
    public background: Background,
    public race: RaceEnum = RaceEnum.Humanoid
  ) {}
}

export const emptyActorDataRqg: ActorDataRqg = new ActorDataRqg(
  emptyHumanoidCharacteristics,
  emptyHumanoidHitLocations,
  emptyAttributes,
  basicElementalRunes,
  basicPowerRunes,
  emptyBackground
);
