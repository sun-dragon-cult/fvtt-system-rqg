import type { RqgItemType } from "@item-model/itemTypes.ts";

export const defaultItemIconsObject = {
  armor: "systems/rqg/assets/images/items/armor.svg",
  cult: "systems/rqg/assets/images/items/cult.svg",
  gear: "systems/rqg/assets/images/items/gear.svg",
  hitLocation: "systems/rqg/assets/images/items/hit-location.svg",
  homeland: "systems/rqg/assets/images/items/homeland.svg",
  occupation: "systems/rqg/assets/images/items/occupation.svg",
  passion: "systems/rqg/assets/images/items/passion.svg",
  rune: "systems/rqg/assets/images/items/rune.svg",
  runeMagic: "systems/rqg/assets/images/items/rune-magic.svg",
  skill: "systems/rqg/assets/images/items/skill.svg",
  spiritMagic: "systems/rqg/assets/images/items/spirit-magic.svg",
  weapon: "systems/rqg/assets/images/items/weapon.svg",
  reputation: "systems/rqg/assets/images/other/reputation.svg",
} satisfies Record<RqgItemType | "reputation", string>;
