import { getGame, localize } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { DefaultItemIconSettings } from "../dialog/defaultItemIconSettings";
import { HitLocationSettings } from "../dialog/hitLocationSettings";
import { systemId } from "./config";
import { defaultItemIconsObject } from "./settings/defaultItemIcons";

export const registerRqgSystemSettings = function () {
  getGame().settings.registerMenu(systemId, "hitLocations", {
    name: localize("RQG.Settings.HitLocations.settingName"),
    label: localize("RQG.Settings.HitLocations.settingLabel"),
    hint: localize("RQG.Settings.HitLocations.settingHint"),
    icon: "fas fa-child",
    type: HitLocationSettings,
    restricted: true,
  });

  getGame().settings.register(systemId, "hitLocations", {
    scope: "world",
    config: false,
    type: Object,
    default: hitLocationNamesObject,
  });

  getGame().settings.registerMenu(systemId, "defaultItemIconSettings", {
    name: localize("RQG.Settings.DefaultItemIcons.settingName"),
    label: localize("RQG.Settings.DefaultItemIcons.settingLabel"),
    hint: localize("RQG.Settings.DefaultItemIcons.settingHint"),
    icon: "fas fa-image",
    type: DefaultItemIconSettings,
    restricted: true,
  });

  getGame().settings.register(systemId, "defaultItemIconSettings", {
    scope: "world",
    config: false,
    type: Object as any, // TODO how to type?
    default: defaultItemIconsObject,
  });

  getGame().settings.register(systemId, "fumbleRollTable", {
    name: localize("RQG.Settings.FumbleRollTable.settingName"),
    hint: localize("RQG.Settings.FumbleRollTable.settingHint"),
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  getGame().settings.register(systemId, "specialCrit", {
    name: localize("RQG.Settings.SpecialCrit.settingName"),
    hint: localize("RQG.Settings.SpecialCrit.settingHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  getGame().settings.register(systemId, "magicRuneName", {
    name: localize("RQG.Settings.MagicRuneName.settingName"),
    hint: localize("RQG.Settings.MagicRuneName.settingHint"),
    scope: "world",
    config: true,
    type: String,
    default: "Magic (condition)",
  });

  getGame().settings.register(systemId, "systemMigrationVersion", {
    name: localize("RQG.Settings.SystemMigrationVersion.settingName"),
    hint: localize("RQG.Settings.SystemMigrationVersion.settingHint"),
    scope: "world",
    config: true, // TODO make this false eventually
    type: String,
    default: "",
  });

  getGame().settings.register(systemId, "actor-wizard-feature-flag", {
    name: "Feature Flag: Enable Actor Wizard",
    hint: "For RnD use only",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
};
