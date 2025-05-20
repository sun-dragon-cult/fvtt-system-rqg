import { getGame, localize } from "../system/util";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export async function migrateWorldDialog(systemVersion: string): Promise<void> {
  return await new Promise((resolve) => {
    const title = localize("RQG.Migration.Dialog.windowTitle");
    // @ts-expect-error renderTemplate
    foundry.applications.handlebars
      .renderTemplate(templatePaths.dialogMigrateWorld, {
        worldVersion: getGame().settings.get(systemId, "worldMigrationVersion"),
        systemVersion: systemVersion,
      })
      .then((contentHtml: string) => {
        const dialog = new Dialog(
          {
            title: title,
            content: contentHtml,
            default: "submit",
            buttons: {
              submit: {
                label: localize("RQG.Migration.Dialog.btnMigrate", {
                  // @ts-expect-error title
                  worldTitle: getGame().world.title,
                  systemVersion: systemVersion,
                }),
                icon: '<i class="fas fa-wrench"></i>',
                callback: () => {
                  resolve();
                },
              },
            },
          },
          { width: 600 },
        );
        dialog.render(true);
      });
  });
}
