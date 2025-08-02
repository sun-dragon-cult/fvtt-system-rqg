import { getGame, getGameUser, localize } from "../util";
import { migrateActorDummy } from "./migrations-actor/migrateActorDummy";
import { type ActorMigration, applyMigrations, type ItemMigration } from "./applyMigrations";
import { systemId } from "../config";
import { tagSkillNameSkillsWithRqid } from "./migrations-item/tagSkillNameSkillsWithRqid";
import { migrateWorldDialog } from "../../applications/migrateWorldDialog";
import { migrateWeaponSkillLinks } from "./migrations-item/migrateWeaponSkillLinks";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqidBatchEditor } from "../../applications/rqid-batch-editor/rqidBatchEditor";
import { migrateRuneItemType } from "./migrations-item/migrateRuneItemType";
import { relabelRuneMagicCommandCultSpiritRqid } from "./migrations-item/relabelRuneMagicCommandCultSpiritRqid";

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  // @ts-expect-error version
  const systemVersion: string = getGame().system.version;
  const worldVersion = getGame().settings.get(systemId, "worldMigrationVersion");
  if (worldVersion === "" && getGameUser().isGM) {
    // Initialize world version to current system version for new worlds (with the default "" version).
    await getGame().settings.set(systemId, "worldMigrationVersion", systemVersion);
    return;
  }
  if (systemVersion === worldVersion) {
    return; // Already up to date
  }

  if (!getGameUser().isGM) {
    ui.notifications?.warn(
      localize("RQG.Migration.WorldNotUpdated", { systemVersion: systemVersion }),
      { permanent: true },
    );
    return;
  }

  // Open a dialog to set missing Rqids on selected items
  await RqidBatchEditor.factory(
    ItemTypeEnum.Skill, // weapon skills need Rqid for weapon -> skill link
    ItemTypeEnum.RuneMagic, // common spells need Rqid for visualisation in spell list
    ItemTypeEnum.Rune, // Future needs
  );

  await migrateWorldDialog(systemVersion);
  ui.notifications?.info(
    localize("RQG.Migration.applyingMigration", { systemVersion: systemVersion }),
    // @ts-expect-error console
    { permanent: true, console: false },
  );
  console.log(`RQG | Starting world migration to version ${systemVersion}`);

  await applyDefaultWorldMigrations();
  // *** Set the migration as complete ***
  await getGame().settings.set(systemId, "worldMigrationVersion", systemVersion);

  ui.notifications?.info(
    localize("RQG.Migration.migrationFinished", { systemVersion: systemVersion }),
    // @ts-expect-error console
    { permanent: true, console: false },
  );
  console.log(`RQG | Finished world migration`);
}

/**
 * Run the default world migration. It is possible to override the migrations for items
 * and or actors by supplying an array of migration functions.
 * Accessible through game.system.api.migrate()
 * This makes it possible to run custom migrations via macros.
 */
export async function applyDefaultWorldMigrations(
  itemMigrations: ItemMigration[] | undefined = undefined,
  actorMigrations: ActorMigration[] | undefined = undefined,
): Promise<void> {
  if (!getGameUser().isGM) {
    ui.notifications?.info(localize("RQG.Notification.Error.GMOnlyOperation"));
    return;
  }
  const worldItemMigrations: ItemMigration[] = itemMigrations ?? [
    tagSkillNameSkillsWithRqid,
    migrateWeaponSkillLinks,
    migrateRuneItemType,
    relabelRuneMagicCommandCultSpiritRqid,
  ];
  const worldActorMigrations: ActorMigration[] = actorMigrations ?? [migrateActorDummy];

  await applyMigrations(worldItemMigrations, worldActorMigrations);
}
