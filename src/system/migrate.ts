import { RqgActor } from "../actors/rqgActor";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { RqgItemData } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import { migrateItemEstimatedPrice } from "./migrations-item/migrateItemEstimatedPrice";
import { migrateHitLocationType } from "./migrations-item/migrateHitLocationType";
import { migrateSkillName } from "./migrations-item/migrateSkillName";
import { migrateArmorName } from "./migrations-item/migrateArmorName";
import {
  migrateRuneDescription,
  migrateRuneImgLocation,
} from "./migrations-item/migrateRuneCompendium";
import { removeArmorActiveEffects } from "./migrations-actor/removeArmorActiveEffects";

type Updates = {
  updateData: any;
  deleteEmbeddedActiveEffectsIds: string[];
};

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  if (game.system.data.version === game.settings.get("rqg", "systemMigrationVersion")) {
    return; // Already updated
  }

  ui.notifications?.info(
    `Applying RQG System Migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`,
    { permanent: true }
  );
  await migrateWorldActors();
  await migrateWorldItems();
  await migrateWorldScenes();
  await migrateWorldCompendiumPacks();

  // *** Set the migration as complete ***
  await game.settings.set("rqg", "systemMigrationVersion", game.system.data.version);
  ui.notifications?.info(`RQG System Migration to version ${game.system.data.version} completed!`, {
    permanent: true,
  });
}

async function migrateWorldActors() {
  // @ts-ignore 0.8 contents
  for (let actor of game.actors!.contents as RqgActor[]) {
    try {
      // @ts-ignore 0.8
      const updates = migrateActorData(actor.toObject());
      // @ts-ignore 0.8
      if (!foundry.utils.isObjectEmpty(updates)) {
        console.log(`RQG | Migrating Actor entity ${actor.name}`);
        await actor.update(updates.updateData, { enforceTypes: false });
      }
      if (updates.deleteEmbeddedActiveEffectsIds?.length) {
        console.log(
          `RQG | Cleaning ${updates.deleteEmbeddedActiveEffectsIds.length} Active Effects from Actor ${actor.name}`
        );
        // @ts-ignore arg can be string | string[] TODO make a PR on the typings
        await actor.deleteEmbeddedDocuments("ActiveEffect", updates.deleteEmbeddedActiveEffectsIds);
      }
    } catch (err) {
      err.message = `RQG | Failed system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err, actor);
    }
  }
}

async function migrateWorldItems() {
  // @ts-ignore 0.8 contents
  for (let item of game.items!.contents as RqgItem[]) {
    try {
      // @ts-ignore 0.8
      const updateData = migrateItemData(item.toObject());
      // @ts-ignore 0.8
      if (!foundry.utils.isObjectEmpty(updateData)) {
        console.log(`RQG | Migrating Item entity ${item.name}`);
        await item.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `RQG | Failed system migration for Item ${item.name}: ${err.message}`;
      console.error(err, item);
    }
  }
}

async function migrateWorldScenes() {
  // @ts-ignore 0.8 contents
  for (let scene of game.scenes!.contents) {
    try {
      const updateData = migrateSceneData(scene.data);
      // @ts-ignore 0.8
      if (!foundry.utils.isObjectEmpty(updateData)) {
        console.log(`RQG | Migrating Scene entity ${scene.name}`);
        await scene.update(updateData, { enforceTypes: false });
        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actorData.
        scene.tokens.contents.forEach((t: any) => (t._actor = null));
      }
    } catch (err) {
      err.message = `RQG | Failed system migration for Scene ${scene.name}: ${err.message}`;
      console.error(err, scene);
    }
  }
}

async function migrateWorldCompendiumPacks() {
  for (let pack of game.packs!) {
    if (pack.metadata.package !== "world") continue;
    if (!["Actor", "Item", "Scene"].includes(pack.metadata.entity)) continue;
    await migrateCompendium(pack);
  }
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
async function migrateCompendium(pack: Compendium): Promise<void> {
  const entity: string = pack.metadata.entity;
  if (!["Actor", "Item", "Scene"].includes(entity)) {
    return;
  }

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate({});
  // @ts-ignore 0.8
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (let doc of documents) {
    let updateData = {};
    try {
      switch (entity) {
        case "Actor":
          updateData = migrateActorData(doc.toObject());
          break;
        case "Item":
          updateData = migrateItemData(doc.toObject());
          break;
        case "Scene":
          updateData = migrateSceneData(doc.data);
          break;
      }

      // Save the entry, if data was changed
      // @ts-ignore 0.8
      if (foundry.utils.isObjectEmpty(updateData)) continue;
      await doc.update(updateData);
      console.log(`RQG | Migrated ${entity} entity ${doc.name} in Compendium ${pack.collection}`);
    } catch (err) {
      err.message = `RQG | Failed system migration for entity ${doc.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err, doc);
    }
  }
  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  console.log(`RQG | Migrated all ${entity} entities from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */
/*  Entity Type Migration Helpers               */
/* -------------------------------------------- */

function migrateActorData(actorData: RqgActorData): Updates {
  let updates: Updates = { updateData: [], deleteEmbeddedActiveEffectsIds: [] };

  // Find active effects that should be removed from the actor
  [removeArmorActiveEffects].forEach((fn: (actorData: RqgActorData) => string[]) =>
    updates.deleteEmbeddedActiveEffectsIds.push(...fn(actorData))
  );

  // Migrate Owned Items
  if (!actorData.items) {
    return updates;
  }
  let hasItemUpdates = false;
  const items = actorData.items.map((i) => {
    let itemUpdate = migrateItemData(i);

    // Update the Owned Item
    if (!isObjectEmpty(itemUpdate)) {
      hasItemUpdates = true;
      return mergeObject(i, itemUpdate, { enforceTypes: false, inplace: false });
    } else {
      return i;
    }
  });
  if (hasItemUpdates) {
    updates.updateData.items = items;
  }
  return updates;
}

/* -------------------------------------------- */

function migrateItemData(itemData: RqgItemData): object {
  let updateData = {};
  [
    migrateItemEstimatedPrice,
    migrateHitLocationType,
    migrateSkillName,
    migrateArmorName,
    migrateRuneImgLocation,
    migrateRuneDescription,
  ].forEach(
    (f: (itemData: RqgItemData) => any) => (updateData = mergeObject(updateData, f(itemData)))
  );

  return updateData;
}

/* -------------------------------------------- */

function migrateSceneData(scene: Scene.Data): object {
  const tokens = scene.tokens.map((token: any) => {
    const t = token.toJSON();
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    } else if (!game.actors!.has(t.actorId)) {
      t.actorId = null;
      t.actorData = {};
    } else if (!t.actorLink) {
      const actorData = duplicate(t.actorData);
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData) as any;
      ["items", "effects"].forEach((embeddedName) => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map(update[embeddedName].map((u: any) => [u._id, u]));
        t.actorData[embeddedName].forEach((original: any) => {
          const update = updates.get(original._id);
          if (update) mergeObject(original, update);
        });
        delete update[embeddedName];
      });

      mergeObject(t.actorData, update);
    }
    return t;
  });
  return { tokens };
}
