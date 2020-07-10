import {Tracked} from "../shared/tracked";

export enum HitLocationsEnum {
  head = "head",
  leftArm = "left-arm",
  rightArm = "right-arm",
  chest = "chest",
  abdomen = "abdomen",
  leftLeg = "left-leg",
  rightLeg = "right-leg"
}

export class HitLocation {
  constructor(
    public name: string,
    public dieFrom: number,
    public dieTo: number,
    public hp: Tracked,
    public wounds: Array<number> = [],
    public ap: number = 0
  ) {
  };
}

// TODO How to make this work? I guess we need constants that are 'compiled'?
// export function createHitLocations(race: RaceEnum): Array<HitLocation> {
//   if (race === RaceEnum.WingedHumanoid) { // TODO Just placeholder for future
//     return emptyHumanoidHitLocations;
//   } else {
//     return emptyHumanoidHitLocations; // Default to humanoid
//   }
// }

const emptyTracked = new Tracked();
export const emptyHumanoidHitLocations = [
  new HitLocation(HitLocationsEnum.head, 19, 20, emptyTracked),
  new HitLocation(HitLocationsEnum.leftArm, 16, 18, emptyTracked),
  new HitLocation(HitLocationsEnum.rightArm, 13, 15, emptyTracked),
  new HitLocation(HitLocationsEnum.chest, 12, 12, emptyTracked),
  new HitLocation(HitLocationsEnum.abdomen, 9, 11, emptyTracked),
  new HitLocation(HitLocationsEnum.leftLeg, 5, 8, emptyTracked),
  new HitLocation(HitLocationsEnum.rightLeg, 1, 4, emptyTracked)
];
