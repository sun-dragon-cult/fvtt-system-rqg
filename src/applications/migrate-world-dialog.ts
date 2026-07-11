import { localize } from "../system/util";
import { systemId } from "../system/config";
import { templatePaths } from "../system/load-handlebars-templates";

export async function migrateWorldDialog(systemVersion: string): Promise<boolean> {
  const content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.dialogMigrateWorld,
    {
      worldVersion: game.settings?.get(systemId, "worldMigrationVersion"),
      systemVersion,
    },
  );
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: localize("RQG.Migration.Dialog.windowTitle") },
    content,
    position: { width: 600 },
    yes: {
      label: localize("RQG.Migration.Dialog.btnMigrate", {
        worldTitle: game.world?.title ?? "",
        systemVersion,
      }),
      icon: "fas fa-wrench",
      default: true,
    },
    no: {
      label: "RQG.Dialog.Common.btnCancel",
      icon: "fas fa-times",
    },
  });

  return confirmed === true;
}
