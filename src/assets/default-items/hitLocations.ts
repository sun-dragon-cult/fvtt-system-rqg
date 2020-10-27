import {
  HitLocationData,
  HitLocationsEnum,
} from "../../data-model/item-data/hitLocationData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

const hitLocations: ItemData<HitLocationData>[] = [
  {
    name: HitLocationsEnum.Head,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 19,
      dieTo: 20,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.LeftArm,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 16,
      dieTo: 18,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.RightArm,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 13,
      dieTo: 15,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.Chest,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 12,
      dieTo: 12,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.Abdomen,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 9,
      dieTo: 11,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.LeftLeg,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 5,
      dieTo: 8,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.RightLeg,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 1,
      dieTo: 4,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
  {
    name: HitLocationsEnum.Tail,
    type: ItemTypeEnum.HitLocation,
    data: {
      dieFrom: 1,
      dieTo: 4,
      hp: {
        value: 0,
        max: 0,
      },
      naturalAp: 0,
      wounds: [],
    },
    flags: {},
    img: "",
  },
];

export default hitLocations;
