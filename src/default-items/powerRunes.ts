import {
  PowerRuneData,
  PowerRuneEnum,
} from "../module/data-model/item-data/powerRuneData";
import { ItemTypeEnum } from "../module/data-model/item-data/itemTypes";

const powerRunes: ItemData<PowerRuneData>[] = [
  {
    name: PowerRuneEnum.Man,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Beast,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/man.svg",
  },
  {
    name: PowerRuneEnum.Beast,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Man,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/beast.svg",
  },
  {
    name: PowerRuneEnum.Fertility,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Death,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/fertility.svg",
  },
  {
    name: PowerRuneEnum.Death,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Fertility,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/death.svg",
  },
  {
    name: PowerRuneEnum.Harmony,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Disorder,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/harmony.svg",
  },
  {
    name: PowerRuneEnum.Disorder,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Harmony,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/disorder.svg",
  },
  {
    name: PowerRuneEnum.Truth,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Illusion,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/truth.svg",
  },
  {
    name: PowerRuneEnum.Illusion,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Truth,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/illusion.svg",
  },
  {
    name: PowerRuneEnum.Stasis,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Movement,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/stasis.svg",
  },
  {
    name: PowerRuneEnum.Movement,
    type: ItemTypeEnum.PowerRune,
    data: {
      opposingRune: PowerRuneEnum.Stasis,
      description: "Se RQG p.xx",
      chance: 50,
      experience: false,
    },
    flags: {},
    img: "systems/rqg/icons/runes/movement_change.svg",
  },
];

export default powerRunes;
