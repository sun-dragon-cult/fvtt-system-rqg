import { migrateItemEstimatedPrice } from "./migrations-item/migrateItemEstimatedPrice";
import { migrateSkillName } from "./migrations-item/migrateSkillName";
import { migrateArmorName } from "./migrations-item/migrateArmorName";
import {
  migrateRuneDescription,
  migrateRuneImgLocation,
} from "./migrations-item/migrateRuneCompendium";
import { getGame } from "../util";
import { migrateHitLocationName } from "./migrations-item/migrateHitLocationName";
import { migratePassionName } from "./migrations-item/migratePassionName";
import { migrateHitLocationHPName } from "./migrations-item/migrateHitLocationHPName";
import { migrateDoubleLeftArms } from "./migrations-item/migrateDoubleLeftArms";
import { migrateCharacterMov } from "./migrations-actor/migrateCharacterMov";
import { migrateRenameCharacterRace } from "./migrations-actor/migrateRenameCharacterRace";
import { migrateToWeaponItem } from "./migrations-item/migrateToWeaponItem";
import { ActorMigration, applyMigrations, ItemMigration } from "./applyMigrations";

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
    migrateItemEstimatedPrice,
    migrateSkillName,
    migrateArmorName,
    migrateRuneImgLocation,
    migrateRuneDescription,
    migrateHitLocationName,
    migratePassionName,
    migrateHitLocationHPName,
    migrateDoubleLeftArms,
    migrateToWeaponItem,
  ];

  const worldActorMigrations: ActorMigration[] = [migrateCharacterMov, migrateRenameCharacterRace];

  await applyMigrations(worldItemMigrations, worldActorMigrations);
}
