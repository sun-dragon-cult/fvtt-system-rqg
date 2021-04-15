import { emptyResource, Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";

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
export const hitLocationHealthStatuses = ["healthy", "wounded", "useless", "severed"] as const;
export type HitLocationHealthState = typeof hitLocationHealthStatuses[number];

export enum HitLocationTypesEnum {
  Limb = "limb",
  Head = "head",
  Chest = "chest",
  Abdomen = "abdomen",
}

export interface HitLocationData {
  dieFrom: number;
  dieTo: number;
  /** Max and value added by ActorSheet.prepareData */
  hp: Resource;
  /** Chest has +1 while arms have -1 for humans */
  baseHpDelta: number;
  /**  Natural armor */
  naturalAp: number;
  wounds: number[];
  hitLocationHealthState: HitLocationHealthState;
  /** How should this hitlocation behave for damage calculation */
  hitLocationType: HitLocationTypesEnum; // TODO *** kan man göra det här smartare? ***
  /** If hitLocationType is Limb then what location name is it connected to. Used for damage calculations */
  connectedTo: string;
  // --- Derived / Convenience Data Below ---
  /** Natural armor + modified armor Active Effect */
  ap?: number;

  hitLocationNamesAll?: HitLocationsEnum[];
  hitLocationTypes?: HitLocationTypesEnum[];
  hitLocationHealthStatuses?: HitLocationHealthState[];
}

export interface HitLocationItemData extends Item.Data<HitLocationData> {
  type: ItemTypeEnum.HitLocation;
}

export const emptyHitLocation: HitLocationData = {
  dieFrom: 0,
  dieTo: 0,
  hp: emptyResource,
  baseHpDelta: 0,
  naturalAp: 0,
  wounds: [],
  hitLocationHealthState: "healthy",
  hitLocationType: HitLocationTypesEnum.Limb,
  connectedTo: "",
};
