import { emptyResource, Resource } from "../shared/resource";

export enum HitLocationsEnum {
  Head = "head",
  LeftArm = "leftArm",
  RightArm = "rightArm",
  Chest = "chest",
  Abdomen = "abdomen",
  LeftLeg = "leftLeg",
  RightLeg = "rightLeg",
  LeftWing = "leftWing",
  RightWing = "rightWing",
  Tail = "tail",
  LeftHindLeg = "leftHindLeg",
  RightHindLeg = "rightHindLeg",
  Forequarter = "forequarter",
  Hindquarter = "hindquarter",
  Thorax = "thorax",
  LeftForeLeg = "leftForeLeg",
  RightForeLeg = "rightForeLeg",
  Shell = "shell",
  Forebody = "forebody",
  LeftHead = "leftHead",
  RightHead = "rightHead",
}

export class HitLocations {
  constructor(
    // TODO Look through the order so that they become intuitive for all races!
    public head: HitLocation,
    public leftArm: HitLocation,
    public rightArm: HitLocation,
    public chest: HitLocation,
    public abdomen: HitLocation,
    public leftLeg: HitLocation,
    public rightLeg: HitLocation,
    public leftWing: HitLocation,
    public rightWing: HitLocation
  ) {}
}

export class HitLocation {
  constructor(
    public dieFrom: number,
    public dieTo: number,
    public hp: Resource, // Max and value added by ActorSheet.prepareData
    public ap: Resource, // Modifiable values
    public wounds: Array<number> = []
  ) {}
}

// TODO Make a map of hit locations per race! Are there more differences than hitlocations?
// TODO How to make this work? I guess we need constants that are 'compiled'?
// export function createHitLocations(race: RaceEnum): Array<HitLocation> {
//   if (race === RaceEnum.WingedHumanoid) { // TODO Just placeholder for future
//     return emptyHumanoidHitLocations;
//   } else {
//     return emptyHumanoidHitLocations; // Default to humanoid
//   }
// }

export const emptyHumanoidHitLocations = new HitLocations(
  new HitLocation(19, 20, emptyResource, emptyResource),
  new HitLocation(16, 18, emptyResource, emptyResource),
  new HitLocation(13, 15, emptyResource, emptyResource),
  new HitLocation(12, 12, emptyResource, emptyResource),
  new HitLocation(9, 11, emptyResource, emptyResource),
  new HitLocation(5, 8, emptyResource, emptyResource),
  new HitLocation(1, 4, emptyResource, emptyResource),
  undefined,
  undefined
);

// TODO Just getting a feel for creating other creatures...
export const emptyHumanoidWingedHitLocations = new HitLocations(
  new HitLocation(19, 20, emptyResource, emptyResource),
  new HitLocation(17, 18, emptyResource, emptyResource),
  new HitLocation(15, 16, emptyResource, emptyResource),
  new HitLocation(10, 10, emptyResource, emptyResource),
  new HitLocation(7, 9, emptyResource, emptyResource),
  new HitLocation(4, 6, emptyResource, emptyResource),
  new HitLocation(1, 3, emptyResource, emptyResource),
  new HitLocation(13, 14, emptyResource, emptyResource),
  new HitLocation(11, 12, emptyResource, emptyResource)
);
