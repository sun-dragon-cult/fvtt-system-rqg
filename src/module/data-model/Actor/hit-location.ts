import {Tracked} from "../shared/tracked";

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
  new HitLocation('head', 19, 20, emptyTracked),
  new HitLocation('left-arm', 16, 18, emptyTracked),
  new HitLocation('right-arm', 13, 15, emptyTracked),
  new HitLocation('chest', 12, 12, emptyTracked),
  new HitLocation('abdomen', 9, 11, emptyTracked),
  new HitLocation('left-leg', 5, 8, emptyTracked),
  new HitLocation('right-leg', 1, 4, emptyTracked)
];
