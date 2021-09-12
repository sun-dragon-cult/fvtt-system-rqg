import { emptyResource, Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";
import { ActorHealthState } from "../actor-data/attributes";

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
  Hindquarter = "hindquarter",
  Forequarter = "forequarter",
  LeftForeLeg = "leftForeLeg",
  RightForeLeg = "rightForeLeg",
  LeftMiddleLeg = "leftMiddleLeg",
  RightMiddleLeg = "rightMiddleLeg",
  LeftCenterRearLeg = "leftCenterRearLeg",
  RightCenterRearLeg = "rightCenterRearLeg",
  LeftCenterFrontLeg = "leftCenterFrontLeg",
  RightCenterFrontLeg = "rightCenterFrontLeg",
  HindBody = "hindBody",
  MidBody = "midBody",
  FrontBody = "frontBody",
  Thorax = "thorax",
  Shell = "shell",
  LeftHead = "leftHead",
  RightHead = "rightHead",
  Body = "body",
  Trunk = "trunk",
  Tentacle1 = "tentacle1",
  Tentacle2 = "tentacle2",
  Tentacle3 = "tentacle3",
  Tentacle4 = "tentacle4",
  Tentacle5 = "tentacle5",
  Tentacle6 = "tentacle6",
  Tentacle7 = "tentacle7",
  Tentacle8 = "tentacle8",
  LeftClaw = "leftClaw",
  RightClaw = "rightClaw",
  LeftHindFlipper = "leftHindFlipper",
  RightHindFlipper = "rightHindFlipper",
  LeftForeFlipper = "leftForeFlipper",
  RightForeFlipper = "rightForeFlipper",
  LeftPaw = "leftPaw",
  RightPaw = "rightPaw",
  LeftPedipalp = "leftPedipalp",
  RightPedipalp = "rightPedipalp",
  Neck = "neck",
  LowerLeftArm = "lowerLeftArm",
  LowerRightArm = "lowerRightArm",
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

export interface HitLocationDataSourceData {
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
  actorHealthImpact: ActorHealthState;
  /** How should this hitlocation behave for damage calculation */
  hitLocationType: HitLocationTypesEnum; // TODO *** kan man göra det här smartare? ***
  /** If hitLocationType is Limb then what location name is it connected to. Used for damage calculations */
  connectedTo: string;
}

// --- Derived Data ---
export interface HitLocationDataPropertiesData extends HitLocationDataSourceData {
  /** Natural armor + armor absorption */
  ap: number;
}

export interface HitLocationDataSource {
  type: ItemTypeEnum.HitLocation;
  data: HitLocationDataSourceData;
}

export interface HitLocationDataProperties {
  type: ItemTypeEnum.HitLocation;
  data: HitLocationDataPropertiesData;
}

export const emptyHitLocation: HitLocationDataSourceData = {
  dieFrom: 0,
  dieTo: 0,
  hp: emptyResource,
  baseHpDelta: 0,
  naturalAp: 0,
  wounds: [],
  hitLocationHealthState: "healthy",
  actorHealthImpact: "healthy",
  hitLocationType: HitLocationTypesEnum.Limb,
  connectedTo: "",
};
