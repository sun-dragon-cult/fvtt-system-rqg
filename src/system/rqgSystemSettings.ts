import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { DefaultItemIconSettings } from "../dialog/defaultItemIconSettings";
import { HitLocationSettings } from "../dialog/hitLocationSettings";
import { systemId } from "./config";
import { defaultItemIconsObject } from "./settings/defaultItemIcons";

export const registerRqgSystemSettings = function () {
  getGame().settings.registerMenu(systemId, "hitLocations", {
    name: "RQG.Settings.HitLocations.settingName",
    label: "RQG.Settings.HitLocations.settingLabel",
    hint: "RQG.Settings.HitLocations.settingHint",
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
    name: "RQG.Settings.DefaultItemIcons.settingName",
    label: "RQG.Settings.DefaultItemIcons.settingLabel",
    hint: "RQG.Settings.DefaultItemIcons.settingHint",
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

  getGame().settings.register(systemId, "worldLanguage", {
    name: "RQG.Settings.WorldLanguage.settingName",
    hint: "RQG.Settings.WorldLanguage.settingHint",
    scope: "world",
    config: true,
    type: String,
    // @ts-expect-error
    choices: CONFIG.supportedLanguages,
    default: "en",
    onChange: () => setTimeout(() => window.location.reload(), 200),
  });

  getGame().settings.register(systemId, "showOnlyWorldLanguagePacks", {
    name: "RQG.Settings.ShowOnlyWorldLanguagePacks.settingName",
    hint: "RQG.Settings.ShowOnlyWorldLanguagePacks.settingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => setTimeout(() => window.location.reload(), 200),
  });

  getGame().settings.register(systemId, "showEnglishLanguagePacksAlso", {
    name: "RQG.Settings.ShowEnglishLanguagePacksAlso.settingName",
    hint: "RQG.Settings.ShowEnglishLanguagePacksAlso.settingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => setTimeout(() => window.location.reload(), 200),
  });

  getGame().settings.register(systemId, "fumbleRollTable", {
    name: "RQG.Settings.FumbleRollTable.settingName",
    hint: "RQG.Settings.FumbleRollTable.settingHint",
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  getGame().settings.register(systemId, "specialCrit", {
    name: "RQG.Settings.SpecialCrit.settingName",
    hint: "RQG.Settings.SpecialCrit.settingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  getGame().settings.register(systemId, "magicRuneName", {
    name: "RQG.Settings.MagicRuneName.settingName",
    hint: "RQG.Settings.MagicRuneName.settingHint",
    scope: "world",
    config: true,
    type: String,
    default: "Magic (condition)",
  });

  getGame().settings.register(systemId, "systemMigrationVersion", {
    name: "RQG.Settings.SystemMigrationVersion.settingName",
    hint: "RQG.Settings.SystemMigrationVersion.settingHint",
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
