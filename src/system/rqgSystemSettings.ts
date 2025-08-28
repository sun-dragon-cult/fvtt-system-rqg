import { DefaultItemIconSettings } from "../applications/defaultItemIconSettings";
import { systemId } from "./config";
import { defaultItemIconsObject } from "./settings/defaultItemIcons";
import TokenRulerSettings from "../applications/settings/tokenRulerSettings";
import { defaultTokenRulerSettings } from "./settings/defaultTokenRulerSettings";

export const registerRqgSystemSettings = function () {
  game.settings?.register(systemId, "worldLanguage", {
    name: "RQG.Settings.WorldLanguage.settingName",
    hint: "RQG.Settings.WorldLanguage.settingHint",
    scope: "world",
    config: true,
    type: String,
    choices: CONFIG.supportedLanguages,
    default: CONFIG.RQG.fallbackLanguage,
    requiresReload: true,
  });

  game.settings?.register(systemId, "autoActivateChatTab", {
    name: "RQG.Settings.AutoactivateChatTab.settingName",
    hint: "RQG.Settings.AutoactivateChatTab.settingHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings?.register(systemId, "sortHitLocationsLowToHigh", {
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

  game.settings?.registerMenu(systemId, "defaultItemIconSettings", {
    name: "RQG.Settings.DefaultItemIcons.settingName",
    label: "RQG.Settings.DefaultItemIcons.settingLabel",
    hint: "RQG.Settings.DefaultItemIcons.settingHint",
    icon: "fas fa-image",
    type: DefaultItemIconSettings as any,
    restricted: true,
  });

  game.settings?.register(systemId, "defaultItemIconSettings", {
    scope: "world",
    config: false,
    type: Object as never, // TODO how to type?
    default: defaultItemIconsObject,
  });

  game.settings?.register(systemId, "fumbleRollTable", {
    name: "RQG.Settings.FumbleRollTable.settingName",
    hint: "RQG.Settings.FumbleRollTable.settingHint",
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  game.settings?.registerMenu(systemId, "tokenRulerSettings", {
    name: "RQG.Settings.TokenRulerSettings.settingName",
    label: "RQG.Settings.TokenRulerSettings.settingLabel",
    hint: "RQG.Settings.TokenRulerSettings.settingHint",
    icon: "fa-solid fa-ruler",
    type: TokenRulerSettings,
    restricted: true,
  });

  game.settings?.register(systemId, "tokenRulerSettings", {
    scope: "world",
    config: false,
    type: Object,
    default: defaultTokenRulerSettings,
  });

  game.settings?.register(systemId, "allowCombatWithoutToken", {
    name: "RQG.Settings.AllowCombatWithoutToken.settingName",
    hint: "RQG.Settings.AllowCombatWithoutToken.settingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings?.register(systemId, "showHeropoints", {
    name: "RQG.Settings.ShowHeropoints.settingName",
    hint: "RQG.Settings.ShowHeropoints.settingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings?.register(systemId, "worldMigrationVersion", {
    name: "RQG.Settings.WorldMigrationVersion.settingName",
    hint: "RQG.Settings.WorldMigrationVersion.settingHint",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings?.register(systemId, "showCharacteristicRatings", {
    name: "RQG.Settings.ShowCharacteristicRatings.settingName",
    hint: "RQG.Settings.ShowCharacteristicRatings.settingHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings?.register(systemId, "actor-wizard-feature-flag", {
    name: "Feature Flag: Enable Actor Wizard",
    hint: "For RnD use only",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
};
