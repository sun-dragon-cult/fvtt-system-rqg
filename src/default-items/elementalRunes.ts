import {
  ElementalRuneData,
  ElementalRuneEnum,
} from "../module/data-model/item-data/elementalRuneData";
import { ItemTypeEnum } from "../module/data-model/item-data/itemTypes";

const elementalRunes: ItemData<ElementalRuneData>[] = [
  {
    name: ElementalRuneEnum.Fire,
    type: ItemTypeEnum.ElementalRune,
    data: {
      description: "Se RQG p.xx",
      chance: 0,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/fire_sky.svg",
  },
  {
    name: ElementalRuneEnum.Darkness,
    type: ItemTypeEnum.ElementalRune,
    data: {
      description: "Se RQG p.xx",
      chance: 0,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/darkness.svg",
  },
  {
    name: ElementalRuneEnum.Water,
    type: ItemTypeEnum.ElementalRune,
    data: {
      description: "Se RQG p.xx",
      chance: 0,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/water.svg",
  },
  {
    name: ElementalRuneEnum.Earth,
    type: ItemTypeEnum.ElementalRune,
    data: {
      description: "Se RQG p.xx",
      chance: 0,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/earth.svg",
  },
  {
    name: ElementalRuneEnum.Air,
    type: ItemTypeEnum.ElementalRune,
    data: {
      description: "Se RQG p.xx",
      chance: 0,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/air.svg",
  },
  {
    name: ElementalRuneEnum.Moon,
    type: ItemTypeEnum.ElementalRune,
    data: {
      description: "Se RQG p.xx",
      chance: 0,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/moon_full.svg",
  },
];

export default elementalRunes;
