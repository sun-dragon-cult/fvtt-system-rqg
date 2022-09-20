import { getGame, localize } from "../util";
import { migrateActorDummy } from "./migrations-actor/migrateActorDummy";
import { ActorMigration, applyMigrations, ItemMigration } from "./applyMigrations";
import { changeRuneExperienceFieldName } from "./migrations-item/changeRuneExperienceFieldName";
import { renameRuneMagicDurationSpecial } from "./migrations-item/renameRuneMagicDurationSpecial";
import { moveRuneIcons } from "./migrations-item/moveRuneIcon";
import { renameSkillIcons } from "./migrations-item/renameSkillIcons";
import { systemId } from "../config";
import { renameDragonewt } from "./migrations-item/renameDragonewt";
import { renameFireSky } from "./migrations-item/renameFireSky";
import { trimCategoryFromSkillNames } from "./migrations-item/trimCategoryFromSkillNames";
import { tagSkillNameSkillsWithRqid } from "./migrations-item/tagSkillNameSkillsWithRqid";
import { renameLearnedToGainedChance } from "./migrations-item/renameLearnedToGainedChance";
import { migrateWorldDialog } from "../../dialog/migrateWorldDialog";

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  // @ts-expect-error v10
  const systemVersion = getGame().system.version;
  const worldVersion = getGame().settings.get(systemId, "worldMigrationVersion");
  if (systemVersion !== worldVersion) {
    await migrateWorldDialog(systemVersion);
    ui.notifications?.info(
      localize("RQG.Migration.applyingMigration", { systemVersion: systemVersion }),
      { permanent: true }
    );
    console.log(`RQG | Starting world migration to version ${systemVersion}`);

    await applyDefaultWorldMigrations();
    // *** Set the migration as complete ***
    await getGame().settings.set(systemId, "worldMigrationVersion", systemVersion);

    ui.notifications?.info(
      localize("RQG.Migration.migrationFinished", { systemVersion: systemVersion }),
      {
        permanent: true,
      }
    );
    console.log(`RQG | Finished world migration`);
  }
}

/**
 * Run the default world migration. It is possible to override the migrations for items
 * and or actors by supplying an array of migration functions.
 * Accessible through game.system.api.migrate()
 * This makes it possible to run custom migrations via macros.
 */
export async function applyDefaultWorldMigrations(
  itemMigrations: ItemMigration[] | undefined = undefined,
  actorMigrations: ActorMigration[] | undefined = undefined
): Promise<void> {
  const worldItemMigrations: ItemMigration[] = itemMigrations ?? [
    changeRuneExperienceFieldName,
    renameRuneMagicDurationSpecial,
    moveRuneIcons,
    renameSkillIcons,
    renameDragonewt,
    renameFireSky,
    trimCategoryFromSkillNames,
    tagSkillNameSkillsWithRqid,
    renameLearnedToGainedChance,
  ];
  const worldActorMigrations: ActorMigration[] = actorMigrations ?? [migrateActorDummy];

  await applyMigrations(worldItemMigrations, worldActorMigrations);
}
