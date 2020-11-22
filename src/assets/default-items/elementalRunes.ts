import { RuneData, RuneTypeEnum } from "../../data-model/item-data/runeData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

const elementalRunes: ItemData<RuneData>[] = [
  {
    name: "Fire (element)",
    type: ItemTypeEnum.Rune,
    data: {
      rune: "Fire",
      runeType: RuneTypeEnum.Element,
      chance: 0,
      experience: false,
      description: "Se RQG p.xx",
      minorRunes: [],
      isMastered: false,
    },
    flags: {},
    img: "systems/rqg/assets/icons/runes/fire_sky.svg",
  },
  {
    name: "Darkness (element)",
    type: ItemTypeEnum.Rune,
    data: {
      rune: "Darkness",
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
    name: "Water (element)",
    type: ItemTypeEnum.Rune,
    data: {
      rune: "Water",
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
    name: "Earth (element)",
    type: ItemTypeEnum.Rune,
    data: {
      rune: "Earth",
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
    name: "Air (element)",
    type: ItemTypeEnum.Rune,
    data: {
      rune: "Air",
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
    name: "Moon (element)",
    type: ItemTypeEnum.Rune,
    data: {
      rune: "Moon",
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
