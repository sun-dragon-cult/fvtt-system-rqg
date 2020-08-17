import { ElementalRuneData } from "../module/data-model/item-data/elementalRuneData";

const elementalRunes: ElementalRuneData[] = JSON.parse(`[
  {
    "name": "fire",
    "permission": {
      "default": 0
    },
    "type": "elementalRune",
    "data": {
      "description": "Se RQG p.xx",
      "chance": 0,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/fire_sky.svg"
  },
  {
    "name": "darkness",
    "permission": {
      "default": 0
    },
    "type": "elementalRune",
    "data": {
      "description": "",
      "chance": 0,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/darkness.svg"
  },
  {
    "name": "water",
    "permission": {
      "default": 0
    },
    "type": "elementalRune",
    "data": {
      "description": "",
      "chance": 0,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/water.svg"
  },
  {
    "name": "earth",
    "permission": {
      "default": 0
    },
    "type": "elementalRune",
    "data": {
      "description": "",
      "chance": 0,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/earth.svg"
  },
  {
    "name": "air",
    "permission": {
      "default": 0
    },
    "type": "elementalRune",
    "data": {
      "description": "",
      "chance": 0,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/air.svg"
  },
  {
    "name": "moon",
    "permission": {
      "default": 0
    },
    "type": "elementalRune",
    "data": {
      "description": "",
      "chance": 0,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/moon_full.svg"
  }
]`);

export default elementalRunes;
