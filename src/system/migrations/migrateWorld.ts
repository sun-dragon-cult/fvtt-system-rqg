import { getGame } from "../util";
import { migrateActorDummy } from "./migrations-actor/migrateActorDummy";
import { ActorMigration, applyMigrations, ItemMigration } from "./applyMigrations";
import { changeRuneExperienceFieldName } from "./migrations-item/changeRuneExperienceFieldName";
import { renameRuneMagicDurationSpecial } from "./migrations-item/renameRuneMagicDurationSpecial";

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  if (getGame().system.data.version !== getGame().settings.get("rqg", "systemMigrationVersion")) {
    ui.notifications?.info(
      `Applying RQG System Migration for version ${
        getGame().system.data.version
      }. Please be patient and do not close your game or shut down your server.`,
      { permanent: true }
    );
    console.log(`RQG | Starting system migration to version ${getGame().system.data.version}`);

    await applyDefaultWorldMigrations();
    // *** Set the migration as complete ***
    await getGame().settings.set("rqg", "systemMigrationVersion", getGame().system.data.version);

    ui.notifications?.info(
      `RQG System Migration to version ${getGame().system.data.version} completed!`,
      {
        permanent: true,
      }
    );
    console.log(`RQG | Finished system migration`);
  }
}

export async function applyDefaultWorldMigrations(): Promise<void> {
  const worldItemMigrations: ItemMigration[] = [
    changeRuneExperienceFieldName,
    renameRuneMagicDurationSpecial,
  ];
  const worldActorMigrations: ActorMigration[] = [migrateActorDummy];

  await applyMigrations(worldItemMigrations, worldActorMigrations);
}
