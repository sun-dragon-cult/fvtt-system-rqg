import { getGame, localize } from "../system/util";
import { systemId } from "../system/config";

export async function migrateWorldDialog(systemVersion: string): Promise<void> {
  return await new Promise((resolve) => {
    const title = localize("RQG.Migration.Dialog.windowTitle");
    renderTemplate("systems/rqg/applications/migrateWorldDialog.hbs", {
      worldVersion: getGame().settings.get(systemId, "worldMigrationVersion"),
      systemVersion: systemVersion,
    }).then((contentHtml) => {
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
