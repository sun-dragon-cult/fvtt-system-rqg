import { getGame, getGameUser, localize } from "../system/util";
import { systemId } from "../system/config";

export class RqgSettings extends Settings {
  static init() {
    CONFIG.ui.settings = RqgSettings;
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    if (!getGameUser().isGM) {
      return;
    }
    html
      .find("#settings-game")
      .append(
        '<button class="trigger-data-migration"><i class="fas fa-wrench"></i> ' +
          localize("RQG.Foundry.Settings.Migrate.TriggerButton") +
          "</button>",
      );
    html.find(".trigger-data-migration").click(() => {
      new Dialog(
        {
          title: localize("RQG.Foundry.Settings.Migrate.TriggerTitle"),
          content: localize("RQG.Foundry.Settings.Migrate.TriggerContents"),
          buttons: {
            migrate: {
              icon: '<i class="fas fa-check"></i>',
              label: localize("RQG.Foundry.Settings.Migrate.TriggerRestart"),
              callback: async () => {
                await getGame().settings.set(systemId, "worldMigrationVersion", "---");
                window.location.reload();
              },
            },
            close: {
              icon: '<i class="fas fa-ban"></i>',
              label: localize("Cancel"),
              callback: () => {},
            },
          },
          default: "close",
        },
        {},
      ).render(true);
    });
  }
}
