import {
  RuneData,
  RuneEnum,
  RuneTypeEnum,
} from "../../data-model/item-data/runeData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

const elementalRunes: ItemData<RuneData>[] = [
  {
    name: RuneEnum.Fire,
    type: ItemTypeEnum.Rune,
    data: {
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      runeType: RuneTypeEnum.Element,
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/fire_sky.svg",
  },
  {
    name: RuneEnum.Darkness,
    type: ItemTypeEnum.Rune,
    data: {
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      runeType: RuneTypeEnum.Element,
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/darkness.svg",
  },
  {
    name: RuneEnum.Water,
    type: ItemTypeEnum.Rune,
    data: {
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      runeType: RuneTypeEnum.Element,
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/water.svg",
  },
  {
    name: RuneEnum.Earth,
    type: ItemTypeEnum.Rune,
    data: {
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      runeType: RuneTypeEnum.Element,
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/earth.svg",
  },
  {
    name: RuneEnum.Air,
    type: ItemTypeEnum.Rune,
    data: {
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      runeType: RuneTypeEnum.Element,
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/air.svg",
  },
  {
    name: RuneEnum.Moon,
    type: ItemTypeEnum.Rune,
    data: {
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      runeType: RuneTypeEnum.Element,
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/moon_full.svg",
  },
];

export default elementalRunes;
