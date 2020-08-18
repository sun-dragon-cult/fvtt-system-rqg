import { PowerRuneData } from "../module/data-model/item-data/powerRuneData";

const powerRunes: PowerRuneData[] = JSON.parse(`[
  {
    "name": "man",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "beast",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/man.svg"
  },
  {
    "name": "beast",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "man",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/beast.svg"
  },
  {
    "name": "fertility",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "death",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/fertility.svg"
  },
  {
    "name": "death",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "fertility",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/death.svg"
  },
  {
    "name": "harmony",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "disorder",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/harmony.svg"
  },
  {
    "name": "disorder",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "harmony",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/disorder.svg"
  },
  {
    "name": "truth",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "illusion",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/truth.svg"
  },
  {
    "name": "illusion",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "truth",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/illusion.svg"
  },
  {
    "name": "stasis",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "movement",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/stasis.svg"
  },
  {
    "name": "movement",
    "permission": {
      "default": 0
    },
    "type": "powerRune",
    "data": {
      "opposingRune": "stasis",
      "description": "Se RQG p.xx",
      "chance": 50,
      "experience": false
    },
    "flags": {},
    "img": "systems/rqg/icons/runes/movement_change.svg"
  }
]`);

export default powerRunes;
