import { localize } from "../system/util";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export class RqgSettings extends foundry.applications.sidebar.tabs.Settings {
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
    await foundry.applications.api.DialogV2.wait({
      window: { title: "RQG.Foundry.Settings.Migrate.TriggerTitle" },
      content: localize("RQG.Foundry.Settings.Migrate.TriggerContents"),
      buttons: [
        {
          action: "migrate",
          label: "RQG.Foundry.Settings.Migrate.TriggerRestart",
          icon: "fas fa-check",
          callback: async () => {
            await game.settings?.set(systemId, "worldMigrationVersion", "---");
            window.location.reload();
          },
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: "fa-solid fa-xmark",
          callback: () => false,
          default: true,
        },
      ],
    });
  }
}
