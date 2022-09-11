import { getGame } from "../util";
import { migrateActorDummy } from "./migrations-actor/migrateActorDummy";
import { ActorMigration, applyMigrations, ItemMigration } from "./applyMigrations";
import { changeRuneExperienceFieldName } from "./migrations-item/changeRuneExperienceFieldName";
import { renameRuneMagicDurationSpecial } from "./migrations-item/renameRuneMagicDurationSpecial";
import { moveRuneIcons } from "./migrations-item/moveRuneIcon";
import { renameSkillIcons } from "./migrations-item/renameSkillIcons";
import { systemId } from "../config";
import { renameDragonewt } from "./migrations-item/renameDragonewt";
import { useRqidDescriptionLinks } from "./migrations-item/migrateDescriptionLinks";
import { renameFireSky } from "./migrations-item/renameFireSky";
import { assignRqidToJEs } from "./assignRqidToJEs";
import { trimCategoryFromSkillNames } from "./migrations-item/trimCategoryFromSkillNames";
import { tagSkillNameSkillsWithRqid } from "./migrations-item/tagSkillNameSkillsWithRqid";

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  if (
    getGame().system.data.version !== getGame().settings.get(systemId, "systemMigrationVersion")
  ) {
    await confirmRunAssignRqidDialog(getGame().system.data.version);
    ui.notifications?.info(
      `Applying RQG System Migration for version ${
        getGame().system.data.version
      }. Please be patient and do not close your game or shut down your server.`,
      { permanent: true }
    );
    console.log(`RQG | Starting system migration to version ${getGame().system.data.version}`);

    await applyDefaultWorldMigrations();
    // *** Set the migration as complete ***
    await getGame().settings.set(systemId, "systemMigrationVersion", getGame().system.data.version);

    ui.notifications?.info(
      `RQG System Migration to version ${getGame().system.data.version} completed!`,
      {
        permanent: true,
      }
    );
    console.log(`RQG | Finished system migration`);
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
    useRqidDescriptionLinks,
    trimCategoryFromSkillNames,
    tagSkillNameSkillsWithRqid,
  ];
  const worldActorMigrations: ActorMigration[] = actorMigrations ?? [migrateActorDummy];

  await applyMigrations(worldItemMigrations, worldActorMigrations);
}

// This is only for this update - since you need to make sure you have tagged the journal entries with rqid before migration.
async function confirmRunAssignRqidDialog(newVersion: string): Promise<void> {
  return await new Promise(async (resolve) => {
    const title = `Migrating RQG system to version ${newVersion}  (current version is ${getGame().settings.get(
      systemId,
      "systemMigrationVersion"
    )})`;
    const content = `
      <h1>Please read before continuing!</h1>
      <p>This version introduces a new internal id (Rqid) that is used for links between documents like items, journal entries etc. This migration will update the
      current (old style) description links from items to journal entry descriptions to use the new Rqids.</p>

      <h2><b>Step 1</b> – Tagging your journal entries with Rqid</h2>
      <p>To make your current description links work, your existing journal entries needs to be tagged with a "Rqid" so they can be linked to. The <b>Assign Rqid IDs</b> button
       will go through all your world and compendium journal entries and assign a rqid to each of them.
       <b>Please do this before continuing with the migration!</b></p>
       <p>When this is finished the browser will reload, and you will end up on this screen again. It is not destructive to run it multiple times (but once is enough 😊).</p>

      <h2><b>Step 2</b> – Running the main migration</h2>
      <p>After the tagging is done you are set to continue with the migration by clicking <b>Run Migration</b>. This main migration will try to follow your current description
      links and convert them to using a Rqid link instead (using the Rqid that was assigned to your journal entries in the first step). It will also apply other more minor
      migrations needed to run this new version.</p>
      <p>Please note that this can take some time if you have a world with many items, actors etc.</p>
      <p>Opening the browser console log (F12) will show you warnings about description migrations that could not take place. This should only happen if the old link wasn't working.
      For a large world this will most likely be too much to go through, but can be examined if you want to find descriptions that don't work.</p>`;
    const dialog = new Dialog(
      {
        title: title,
        content: content,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fa fa-tags"></i>',
            label: "<b>Step 1</b> – Assign Rqid IDs",
            callback: async () => {
              await assignRqidToJEs();
              console.log("RQG | *** Reloading browser to force pack index update ***");
              location.reload();
            },
          },
          cancel: {
            label: "<b>Step 2</b> – Run Migration",
            icon: '<i class="fa fa-arrow-right"></i>',
            callback: () => {
              resolve();
            },
          },
        },
      },
      { width: 600 }
    );
    await dialog.render(true);
  });
}
