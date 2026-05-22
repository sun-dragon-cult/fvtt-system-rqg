import { localize } from "../system/util";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export async function migrateWorldDialog(systemVersion: string): Promise<void> {
  const content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.dialogMigrateWorld,
    {
      worldVersion: game.settings?.get(systemId, "worldMigrationVersion"),
      systemVersion: systemVersion,
    },
  );
  await foundry.applications.api.DialogV2.wait({
    window: { title: localize("RQG.Migration.Dialog.windowTitle") },
    content,
    position: { width: 600 },
    buttons: [
      {
        action: "submit",
        label: localize("RQG.Migration.Dialog.btnMigrate", {
          worldTitle: game.world?.title ?? "",
          systemVersion: systemVersion,
        }),
        icon: "fas fa-wrench",
        default: true,
        callback: async () => {},
      },
    ],
  });
}
