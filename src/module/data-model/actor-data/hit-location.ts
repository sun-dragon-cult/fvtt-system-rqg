import { emptyTracked, Tracked } from "../shared/tracked";

export enum HitLocationsEnum {
  head = "head",
  leftArm = "leftArm",
  rightArm = "rightArm",
  chest = "chest",
  abdomen = "abdomen",
  leftLeg = "leftLeg",
  rightLeg = "rightLeg",
  leftWing = "leftWing",
  rightWing = "rightWing",
  tail = "tail",
  leftHindLeg = "leftHindLeg",
  rightHindLeg = "rightHindLeg",
  forequarter = "forequarter",
  hindquarter = "hindquarter",
  thorax = "thorax",
  leftForeLeg = "leftForeLeg",
  rightForeLeg = "rightForeLeg",
  shell = "shell",
  forebody = "forebody",
  leftHead = "leftHead",
  rightHead = "rightHead",
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
    public hp: Tracked,
    public wounds: Array<number> = [],
    public ap: number = 0
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
  new HitLocation(19, 20, emptyTracked),
  new HitLocation(16, 18, emptyTracked),
  new HitLocation(13, 15, emptyTracked),
  new HitLocation(12, 12, emptyTracked),
  new HitLocation(9, 11, emptyTracked),
  new HitLocation(5, 8, emptyTracked),
  new HitLocation(1, 4, emptyTracked),
  undefined,
  undefined
);

// TODO Just getting a feel for creating other creatures...
export const emptyHumanoidWingedHitLocations = new HitLocations(
  new HitLocation(19, 20, emptyTracked),
  new HitLocation(17, 18, emptyTracked),
  new HitLocation(15, 16, emptyTracked),
  new HitLocation(10, 10, emptyTracked),
  new HitLocation(7, 9, emptyTracked),
  new HitLocation(4, 6, emptyTracked),
  new HitLocation(1, 3, emptyTracked),
  new HitLocation(13, 14, emptyTracked),
  new HitLocation(11, 12, emptyTracked)
);
