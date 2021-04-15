import { HitLocationItemData, HitLocationTypesEnum } from "../data-model/item-data/hitLocationData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

export const mockLeftLeg: HitLocationItemData = {
  _id: "bMcHZtyuaaw56m9f",
  name: "leftLeg",
  type: ItemTypeEnum.HitLocation,
  data: {
    dieFrom: 5,
    dieTo: 8,
    hp: {
      value: 5,
      max: 5,
    },
    baseHpDelta: 0,
    naturalAp: 0,
    wounds: [],
    hitLocationHealthState: "healthy",
    hitLocationType: HitLocationTypesEnum.Limb,
    connectedTo: "abdomen",
  },
  sort: 400001,
  flags: {
    exportSource: {
      world: "dev",
      system: "rqg",
      coreVersion: "0.7.9",
      systemVersion: "0.15.0",
    },
  },
  img: "icons/svg/mystery-man.svg",
  effects: [],
  permission: {
    userId: 123,
    default: 0,
  },
};

export const mockHead: HitLocationItemData = {
  _id: "bMcHZtyuaaw56m9f",
  name: "head",
  type: ItemTypeEnum.HitLocation,
  data: {
    dieFrom: 19,
    dieTo: 20,
    hp: {
      value: 5,
      max: 5,
    },
    baseHpDelta: 0,
    naturalAp: 0,
    wounds: [],
    hitLocationHealthState: "healthy",
    hitLocationType: HitLocationTypesEnum.Head,
    connectedTo: "chest",
  },
  sort: 400001,
  flags: {
    exportSource: {
      world: "dev",
      system: "rqg",
      coreVersion: "0.7.9",
      systemVersion: "0.15.0",
    },
  },
  img: "icons/svg/mystery-man.svg",
  effects: [],
  permission: {
    userId: 123,
    default: 0,
  },
};

export const mockChest: HitLocationItemData = {
  _id: "bMcHZtyuaaw56m9f",
  name: "chest",
  type: ItemTypeEnum.HitLocation,
  data: {
    dieFrom: 12,
    dieTo: 12,
    hp: {
      value: 6,
      max: 6,
    },
    baseHpDelta: 1,
    naturalAp: 0,
    wounds: [],
    hitLocationHealthState: "healthy",
    hitLocationType: HitLocationTypesEnum.Chest,
    connectedTo: "",
  },
  sort: 400001,
  flags: {
    exportSource: {
      world: "dev",
      system: "rqg",
      coreVersion: "0.7.9",
      systemVersion: "0.15.0",
    },
  },
  img: "icons/svg/mystery-man.svg",
  effects: [],
  permission: {
    userId: 123,
    default: 0,
  },
};

export const mockAbdomen: HitLocationItemData = {
  _id: "bMcHZtyuaaw56m9f",
  name: "chest",
  type: ItemTypeEnum.HitLocation,
  data: {
    dieFrom: 9,
    dieTo: 11,
    hp: {
      value: 5,
      max: 5,
    },
    baseHpDelta: 0,
    naturalAp: 0,
    wounds: [],
    hitLocationHealthState: "healthy",
    hitLocationType: HitLocationTypesEnum.Abdomen,
    connectedTo: "",
  },
  sort: 400001,
  flags: {
    exportSource: {
      world: "dev",
      system: "rqg",
      coreVersion: "0.7.9",
      systemVersion: "0.15.0",
    },
  },
  img: "icons/svg/mystery-man.svg",
  effects: [],
  permission: {
    userId: 123,
    default: 0,
  },
};
