import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { DefaultItemIconSettings } from "../dialog/defaultItemIconSettings";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationSettings } from "../dialog/hitLocationSettings";

export const registerRqgSystemSettings = function () {
  getGame().settings.registerMenu("rqg", "hitLocations", {
    name: getGame().i18n.localize("RQG.Settings.HitLocations.settingName"),
    label: getGame().i18n.localize("RQG.Settings.HitLocations.settingLabel"),
    hint: getGame().i18n.localize("RQG.Settings.HitLocations.settingHint"),
    icon: "fas fa-child",
    type: HitLocationSettings,
    restricted: true,
  });

  getGame().settings.register("rqg", "hitLocations", {
    scope: "world",
    config: false,
    type: Object,
    default: hitLocationNamesObject,
  });

  getGame().settings.registerMenu("rqg", "defaultItemIconSettings", {
    name: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.settingName"),
    label: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.settingLabel"),
    hint: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.settingHint"),
    icon: "fas fa-image",
    type: DefaultItemIconSettings,
    restricted: true,
  });

  getGame().settings.register("rqg", "defaultItemIconSettings", {
    scope: "world",
    config: false,
    type: Object,
    default: {
      [ItemTypeEnum.Armor]: "systems/rqg/assets/images/armor/cuirass.svg",
      [ItemTypeEnum.Cult]: "systems/rqg/assets/images/items/cult.svg",
      [ItemTypeEnum.Gear]: "systems/rqg/assets/images/gear/knapsack.svg",
      [ItemTypeEnum.HitLocation]: "systems/rqg/assets/images/items/hit-location.svg",
      [ItemTypeEnum.Passion]: "systems/rqg/assets/images/passion/love.svg",
      [ItemTypeEnum.Rune]: "systems/rqg/assets/images/runes/chaos.svg",
      [ItemTypeEnum.RuneMagic]: "systems/rqg/assets/images/items/rune-magic.svg",
      [ItemTypeEnum.Skill]: "systems/rqg/assets/images/items/skill.svg",
      [ItemTypeEnum.SpiritMagic]: "systems/rqg/assets/images/items/spirit-magic.svg",
      [ItemTypeEnum.Weapon]: "systems/rqg/assets/images/items/weapon.svg",
      Reputation: "systems/rqg/assets/images/other/reputation.svg",
    },
  });

  getGame().settings.register("rqg", "runesCompendium", {
    name: getGame().i18n.localize("RQG.Settings.RunesCompendium.settingName"),
    hint: getGame().i18n.localize("RQG.Settings.RunesCompendium.settingHint"),
    scope: "world",
    config: true,
    type: String,
    default: "rqg.runes",
  });

  getGame().settings.register("rqg", "fumbleRollTable", {
    name: getGame().i18n.localize("RQG.Settings.FumbleRollTable.settingName"),
    hint: getGame().i18n.localize("RQG.Settings.FumbleRollTable.settingHint"),
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  getGame().settings.register("rqg", "specialCrit", {
    name: getGame().i18n.localize("RQG.Settings.SpecialCrit.settingName"),
    hint: getGame().i18n.localize("RQG.Settings.SpecialCrit.settingHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  getGame().settings.register("rqg", "magicRuneName", {
    name: getGame().i18n.localize("RQG.Settings.MagicRuneName.settingName"),
    hint: getGame().i18n.localize("RQG.Settings.MagicRuneName.settingHint"),
    scope: "world",
    config: true,
    type: String,
    default: "Magic (condition)",
  });

  getGame().settings.register("rqg", "systemMigrationVersion", {
    name: getGame().i18n.localize("RQG.Settings.SystemMigrationVersion.settingName"),
    hint: getGame().i18n.localize("RQG.Settings.SystemMigrationVersion.settingHint"),
    scope: "world",
    config: true, // TODO make this false eventually
    type: String,
    default: "",
  });
};
