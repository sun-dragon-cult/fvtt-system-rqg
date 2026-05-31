import { localize } from "../system/util";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";

import Settings = foundry.applications.sidebar.tabs.Settings;

export class RqgSettings extends Settings {
  static init() {
    CONFIG.ui.settings = RqgSettings;
  }

  static override DEFAULT_OPTIONS = {
    window: {
      title: "SIDEBAR.TabSettings",
    },
    actions: {
      worldMigration: RqgSettings.migrateWorld,
    },
  };

  static override PARTS = {
    settings: {
      template: templatePaths.settings,
      root: true,
    },
  };

  static async migrateWorld(): Promise<void> {
    if (!game.user?.isGM) {
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "RQG.Foundry.Settings.Migrate.TriggerTitle" },
      content: localize("RQG.Foundry.Settings.Migrate.TriggerContents"),
      yes: {
        action: "migrate",
        label: "RQG.Foundry.Settings.Migrate.TriggerRestart",
        icon: "fas fa-check",
      },
      no: {
        action: "cancel",
        label: "Cancel",
        icon: "fa-solid fa-xmark",
        default: true,
      },
    });

    if (confirmed) {
      await game.settings?.set(systemId, "worldMigrationVersion", "---");
      window.location.reload();
    }
  }
}
