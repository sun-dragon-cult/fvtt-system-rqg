import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { DefaultItemIconSettings } from "../applications/defaultItemIconSettings";
import { systemId } from "./config";
import { defaultItemIconsObject } from "./settings/defaultItemIcons";

export const registerRqgSystemSettings = function () {
  getGame().settings.register(systemId, "worldLanguage", {
    name: "RQG.Settings.WorldLanguage.settingName",
    hint: "RQG.Settings.WorldLanguage.settingHint",
    scope: "world",
    config: true,
    type: String,
    // @ts-expect-error choices, requiresReload
    choices: CONFIG.supportedLanguages,
    default: CONFIG.RQG.fallbackLanguage,
    requiresReload: true,
  });

  getGame().settings.register(systemId, "hitLocations", {
    scope: "world",
    config: false,
    type: Object,
    default: hitLocationNamesObject,
  });

  getGame().settings.register(systemId, "sortHitLocationsLowToHigh", {
    name: "RQG.Settings.SortHitLocationsLowToHigh.settingName",
    hint: "RQG.Settings.SortHitLocationsLowToHigh.settingHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    // Rerender all actor sheets the user has open
    onChange: () => {
      Object.values(ui.windows).forEach((a: any) => {
        if (a?.document?.type === "character") {
          a.render();
        }
      });
    },
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

  getGame().settings.register(systemId, "fumbleRollTable", {
    name: "RQG.Settings.FumbleRollTable.settingName",
    hint: "RQG.Settings.FumbleRollTable.settingHint",
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  getGame().settings.register(systemId, "showHeropoints", {
    name: "RQG.Settings.ShowHeropoints.settingName",
    hint: "RQG.Settings.ShowHeropoints.settingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  getGame().settings.register(systemId, "worldMigrationVersion", {
    name: "RQG.Settings.WorldMigrationVersion.settingName",
    hint: "RQG.Settings.WorldMigrationVersion.settingHint",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  getGame().settings.register(systemId, "showCharacteristicRatings", {
    name: "RQG.Settings.ShowCharacteristicRatings.settingName",
    hint: "RQG.Settings.ShowCharacteristicRatings.settingHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
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
