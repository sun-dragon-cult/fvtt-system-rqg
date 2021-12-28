import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { HitLocationSettings } from "../dialog/hitLocationSettings";

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
    name: getGame().i18n.localize("RQG.Settings.Hitlocations.settingName"),
    hint: getGame().i18n.localize("RQG.Settings.Hitlocations.settingHint"),
    scope: "world",
    config: false,
    type: Object,
    default: hitLocationNamesObject,
  });

  getGame().settings.registerMenu("rqg", "hitLocations", {
    name: getGame().i18n.localize("RQG.Settings.Hitlocations.settingName"),
    label: getGame().i18n.localize("RQG.Settings.Hitlocations.hitLocationNames"),
    hint: getGame().i18n.localize("RQG.Settings.Hitlocations.settingHint"),
    icon: "fas fa-child",
    type: HitLocationSettings,
    restricted: true,
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
