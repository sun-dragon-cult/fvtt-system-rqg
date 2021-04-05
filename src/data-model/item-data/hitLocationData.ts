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
  // --- Derived / Convenience Data Below ---
  /** Natural armor + modified armor Active Effect */
  ap?: number;
  hitLocationTypes?: HitLocationsEnum[];
}

export interface HitLocationItemData extends Item.Data<HitLocationData> {
  type: ItemTypeEnum.HitLocation;
}

export const emptyHitLocation: HitLocationData = {
  dieFrom: 0,
  dieTo: 0,
  hp: emptyResource, // Max and value added by ActorSheet.prepareData
  baseHpDelta: 0,
  naturalAp: 0,
  wounds: [],
};
