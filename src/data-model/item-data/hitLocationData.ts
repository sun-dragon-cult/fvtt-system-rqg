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

// TODO differentiate between severed & maimed? slash / crush or impale
export const limbHealthStatuses = ["healthy", "wounded", "useless", "severed"] as const;
export type LimbHealthState = typeof limbHealthStatuses[number];

export enum HitLocationTypesEnum {
  Limb = "limb",
  Head = "head",
  Chest = "chest",
  Abdomen = "abdomen",
}

export type HitLocationData = {
  dieFrom: number;
  dieTo: number;
  hp: Resource; // Max and value added by ActorSheet.prepareData
  baseHpDelta: number; // Chest has +1 while arms have -1 for humans
  naturalAp: number; // Natural armor
  wounds: Array<number>;
  limbHealthState: LimbHealthState;
  hitLocationType: HitLocationTypesEnum; // TODO *** kan man göra det här smartare? ***
  connectedTo: string; // If hitLocationType is Limb then what location is it connected to. Used for Damage.
  // --- Derived / Convenience Data Below ---
  ap?: number; // Natural armor + modified armor Active Effect
};

export const emptyHitLocation: HitLocationData = {
  dieFrom: 0,
  dieTo: 0,
  hp: emptyResource, // Max and value added by ActorSheet.prepareData
  baseHpDelta: 0,
  naturalAp: 0,
  wounds: [],
  limbHealthState: "healthy",
  hitLocationType: HitLocationTypesEnum.Limb,
  connectedTo: "",
};
