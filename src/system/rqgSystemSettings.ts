import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { DefaultIconSettings } from "../dialog/defaultIconSettings";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

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

  getGame().settings.registerMenu("rqg", "defaultIconSettings", {
    name: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.settingsName"),
    label: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.settingsLabel"),
    hint: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.settingsHint"),
    icon: "fas fa-image",
    type: DefaultIconSettings,
    restricted: true,
  });

  getGame().settings.register("rqg", "defaultIconSettings", {
    scope: "world",
    config: false,
    type: Object,
    default: {
      [ItemTypeEnum.Armor]: "/systems/rqg/assets/images/armor/cuirass.svg",
      [ItemTypeEnum.Cult]: "/systems/rqg/assets/images/items/cult.svg",
      [ItemTypeEnum.Gear]: "/systems/rqg/assets/images/gear/knapsack.svg",
      [ItemTypeEnum.HitLocation]: "/systems/rqg/assets/images/items/hit-location.svg",
      [ItemTypeEnum.Passion]: "/systems/rqg/assets/images/passion/love.svg",
      [ItemTypeEnum.Rune]: "/systems/rqg/assets/runes/chaos.svg",
      [ItemTypeEnum.RuneMagic]: "/systems/rqg/assets/images/items/rune-magic.svg",
      [ItemTypeEnum.Skill]: "/systems/rqg/assets/images/items/skill.svg",
      [ItemTypeEnum.SpiritMagic]: "/systems/rqg/assets/images/items/spirit-magic.svg",
      [ItemTypeEnum.Weapon]: "/systems/rqg/assets/images/items/weapon.svg",
    },
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
