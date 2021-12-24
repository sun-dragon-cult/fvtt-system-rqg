import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";

export const registerRqgSystemSettings = function () {
  getGame().settings.register("rqg", "specialCrit", {
    name: "Special & Hyper Critical results",
    hint: "Add the possibility to roll a special critical (skill/100) and hyper critical (skill/500)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  getGame().settings.register("rqg", "runesCompendium", {
    name: "Rune items compendium",
    hint: "The runes in the specified compendium will be used in the system. Please include all possible runes.",
    scope: "world",
    config: true,
    type: String,
    default: "rqg.runes",
  });

  getGame().settings.register("rqg", "fumbleRollTable", {
    name: "Fumble Roll Table",
    hint: "The name of the Fumble roll table - will be used in combat",
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  getGame().settings.register("rqg", "hitLocations", {
    name: "List of hit location names",
    hint: "The hit location names are used in dropdowns for armor coverage and when naming a new hit location.",
    scope: "world",
    config: false, // TODO create a submenu for configuration
    type: Object,
    default: hitLocationNamesObject,
  });

  getGame().settings.register("rqg", "defaultIconArmor", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconArmorName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconArmorHint"),
    scope: "world",
    config: true,
    type: String,
    default: "systems/rqg/assets/images/armor/cuirass.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconCult", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconCultName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconCultHint"),
    scope: "world",
    config: true,
    type: String,
    default: "systems/rqg/assets/images/items/cult.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconGear", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconGearName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconGearHint"),
    scope: "world",
    config: true,
    type: String,
    default: "systems/rqg/assets/images/gear/knapsack.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconHitLocation", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconHitLocationName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconHitLocationHint"),
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/images/items/hit-location.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconPassion", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconPassionName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconPassionHint"),
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/images/passion/love.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconRune", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconRuneName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconRuneHint"),
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/runes/chaos.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconRuneMagicSpell", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconRuneMagicSpellName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconRuneMagicSpellHint"),
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/images/items/rune-magic.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconSkill", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconSkillName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconSkillHint"),
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/images/items/skill.svg",
    //@ts-ignore
    filePicker: "image",
  });

  getGame().settings.register("rqg", "defaultIconSpiritMagicSpell", {
    name: getGame().i18n.format("RQG.SETTINGS.defaultIconSpiritMagicSpellName"),
    hint: getGame().i18n.format("RQG.SETTINGS.defaultIconSpiritMagicSpellHint"),
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/images/items/spirit-magic.svg",
    //@ts-ignore
    filePicker: "image",
  });
  

  getGame().settings.register("rqg", "defaultIconWeapon", {
    name: "Default Weapon Icon",
    hint: "The icon used for newly created Weapon items.",
    scope: "world",
    config: true,
    type: String,
    default: "/systems/rqg/assets/images/items/weapon.svg",
    //@ts-ignore
    filePicker: "image",
  });



  getGame().settings.register("rqg", "systemMigrationVersion", {
    name: "System Migration Version",
    hint: "Do not touch this unless you really know what you are doing!",
    scope: "world",
    config: true, // TODO make this false eventually
    type: String,
    default: "",
  });
};
