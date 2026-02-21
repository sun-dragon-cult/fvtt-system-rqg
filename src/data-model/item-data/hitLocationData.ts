import { Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";
import type { ActorHealthState } from "../actor-data/attributes";
import type { RqgItem } from "@items/rqgItem.ts";

export type HitLocationItem = RqgItem & { system: HitLocationDataPropertiesData };

// TODO differentiate between severed & maimed? slash / crush or impale
export const hitLocationHealthStatuses = ["healthy", "wounded", "useless", "severed"] as const;
export type HitLocationHealthState = (typeof hitLocationHealthStatuses)[number];

export const hitLocationHealthStatusOptions: SelectOptionData<HitLocationHealthState>[] =
  hitLocationHealthStatuses.map((status) => ({
    value: status,
    label: "RQG.Item.HitLocation.HealthStatusEnum." + status,
  }));

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
  hitPoints: Resource;
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
  armorPoints: number;
}

export interface HitLocationDataSource {
  type: typeof ItemTypeEnum.HitLocation;
  system: HitLocationDataSourceData;
}

export interface HitLocationDataProperties {
  type: typeof ItemTypeEnum.HitLocation;
  system: HitLocationDataPropertiesData;
}

// export const defaultHitLocationData: HitLocationDataSourceData = {
//   dieFrom: 0,
//   dieTo: 0,
//   hitPoints: defaultResource,
//   baseHpDelta: 0,
//   naturalAp: 0,
//   wounds: [],
//   hitLocationHealthState: "healthy",
//   actorHealthImpact: "healthy",
//   hitLocationType: HitLocationTypesEnum.Limb,
//   connectedTo: "",
// };
