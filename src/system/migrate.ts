import { RqgItem } from "../items/rqgItem";
import { migrateItemEstimatedPrice } from "./migrations-item/migrateItemEstimatedPrice";
import { migrateSkillName } from "./migrations-item/migrateSkillName";
import { migrateArmorName } from "./migrations-item/migrateArmorName";
import {
  migrateRuneDescription,
  migrateRuneImgLocation,
} from "./migrations-item/migrateRuneCompendium";
import { convertDeleteKeyToFoundrySyntax, getGame } from "./util";
import {
  ActorData,
  ActorDataConstructorData,
  ActorDataSource,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ItemDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import {
  ItemData,
  SceneData,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { migrateHitLocationName } from "./migrations-item/migrateHitLocationName";
import { migratePassionName } from "./migrations-item/migratePassionName";
import { migrateHitLocationHPName } from "./migrations-item/migrateHitLocationHPName";
import { migrateDoubleLeftArms } from "./migrations-item/migrateDoubleLeftArms";
import { migrateCharacterMov } from "./migrations-actor/migrateCharacterMov";
import { migrateRenameCharacterRace } from "./migrations-actor/migrateRenameCharacterRace";
import { migrateToWeaponItem } from "./migrations-item/migrateToWeaponItem";

export type ItemUpdate =
  | object &
      DeepPartial<ItemDataConstructorData | (ItemDataConstructorData & Record<string, unknown>)>;

export type ActorUpdate =
  | object &
      DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)>;

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  if (getGame().system.data.version !== getGame().settings.get("rqg", "systemMigrationVersion")) {
    await forceMigrateWorld();
  }
}

export async function forceMigrateWorld(): Promise<void> {
  ui.notifications?.info(
    `Applying RQG System Migration for version ${
      getGame().system.data.version
    }. Please be patient and do not close your game or shut down your server.`,
    { permanent: true }
  );
  console.log(`RQG | Starting system migration to version ${getGame().system.data.version}`);
  await migrateWorldActors();
  await migrateWorldItems();
  await migrateWorldScenes();
  await migrateWorldCompendiumPacks();

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

async function migrateWorldActors(): Promise<void> {
  for (let actor of getGame().actors!.contents) {
    try {
      const updates = await migrateActorData(actor.toObject() as any); // TODO fix type
      if (!foundry.utils.isObjectEmpty(updates)) {
        const convertedUpdates = convertDeleteKeyToFoundrySyntax(updates);
        console.log(`RQG | Migrating Actor document ${actor.name}`, convertedUpdates);
        await actor.update(convertedUpdates, { enforceTypes: false });
      }
    } catch (err: any) {
      err.message = `RQG | Failed system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err, actor);
    }
  }
}

async function migrateWorldItems() {
  for (let item of getGame().items!.contents as RqgItem[]) {
    try {
      const updateData = await migrateItemData(item.data);
      if (!foundry.utils.isObjectEmpty(updateData)) {
        const convertedUpdates = convertDeleteKeyToFoundrySyntax(updateData);
        console.log(`RQG | Migrating Item document ${item.name}`, convertedUpdates);
        await item.update(convertedUpdates, { enforceTypes: false });
      }
    } catch (err: any) {
      err.message = `RQG | Failed system migration for Item ${item.name}: ${err.message}`;
      console.error(err, item);
    }
  }
}

async function migrateWorldScenes() {
  for (let scene of getGame().scenes!) {
    try {
      const updateData = await migrateSceneData(scene.data);
      if (!foundry.utils.isObjectEmpty(updateData)) {
        const convertedUpdates = convertDeleteKeyToFoundrySyntax(updateData);
        console.log(`RQG | Migrating Scene document ${scene.name}`, convertedUpdates);
        await scene.update(convertedUpdates, { enforceTypes: false });

        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actorData.
        scene.tokens.contents.forEach((t: any) => (t._actor = null));
      }
    } catch (err: any) {
      err.message = `RQG | Failed system migration for Scene ${scene.name}: ${err.message}`;
      console.error(err, scene);
    }
  }
}

async function migrateWorldCompendiumPacks() {
  for (let pack of getGame().packs!) {
    if (pack.metadata.package !== "world") {
      continue;
    }
    if (!["Actor", "Item", "Scene"].includes(pack.metadata.entity)) {
      continue;
    }
    await migrateCompendium(pack);
  }
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
async function migrateCompendium(
  pack: CompendiumCollection<CompendiumCollection.Metadata>
): Promise<void> {
  const documentType: string = pack.metadata.entity;
  if (!["Actor", "Item", "Scene"].includes(documentType)) {
    return;
  }

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate({});
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (let doc of documents) {
    let updateData = {};
    let deleteIds: string[] = [];
    try {
      switch (documentType) {
        case "Actor":
          updateData = await migrateActorData(doc.toObject());
          deleteIds = getActiveEffectsToDelete(doc.toObject());
          break;
        case "Item":
          updateData = await migrateItemData(doc.toObject());
          break;
        case "Scene":
          updateData = await migrateSceneData(doc.data);
          break;
      }

      if (deleteIds.length) {
        await doc.deleteEmbeddedDocuments("ActiveEffect", deleteIds);
        console.log(
          `RQG | Deleted ${deleteIds.length} Active Effects from document ${doc.name} in Compendium ${pack.collection}`
        );
      }

      // Save the entry, if data was changed
      if (foundry.utils.isObjectEmpty(updateData)) {
        continue;
      }
      const convertedUpdates = convertDeleteKeyToFoundrySyntax(updateData);
      console.log(
        `RQG | Migrating ${documentType} document ${doc.name} in Compendium ${pack.collection}`,
        convertedUpdates
      );
      await doc.update(convertedUpdates);
    } catch (err: any) {
      err.message = `RQG | Failed system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err, doc);
    }
  }
  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  console.log(`RQG | Migrated all ${documentType} documents from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */
/*  Document Type Migration Helpers               */
/* -------------------------------------------- */

async function migrateActorData(actorData: ActorData): Promise<ActorUpdate> {
  let updateData: ActorUpdate = {};
  [migrateCharacterMov, migrateRenameCharacterRace].forEach(
    (fn: (actorData: ActorData) => ActorUpdate) =>
      (updateData = mergeObject(updateData, fn(actorData)))
  );

  // Migrate Owned Items
  if (actorData.items) {
    let hasItemUpdates = false;
    const items = await Promise.all(
      actorData.items.map(async (item: any) => {
        let itemUpdate = await migrateItemData(item, actorData); // TODO item is mistyped?? ItemDataSource or ItemData?

        // Update the Owned Item
        if (!isObjectEmpty(itemUpdate)) {
          hasItemUpdates = true;
          return mergeObject(item, itemUpdate, { enforceTypes: false, inplace: false });
        } else {
          return item;
        }
      })
    );
    if (hasItemUpdates) {
      updateData.items = items;
    }
  }
  return updateData;
}

function getActiveEffectsToDelete(actorData: Partial<ActorDataSource>): string[] {
  if (!actorData.effects) {
    return [];
  }
  return actorData.effects.reduce((acc: string[], effect) => {
    if (effect.label === "Armor" && !!effect._id) {
      return [...acc, effect._id];
    } else {
      return acc;
    }
  }, []);
}

/* -------------------------------------------- */

async function migrateItemData(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  let updateData: ItemUpdate = {};
  for (const fn of [
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
  ]) {
    updateData = mergeObject(updateData, await fn(itemData, owningActorData));
  }
  return updateData;
}

/* -------------------------------------------- */

async function migrateSceneData(scene: SceneData): Promise<object> {
  const tokens = await Promise.all(
    scene.tokens.map(async (token) => {
      const t = token.toJSON();
      if (!t.actorId || t.actorLink) {
        t.actorData = {};
      } else if (!getGame().actors!.has(t.actorId)) {
        t.actorId = null;
        t.actorData = {};
      } else if (!t.actorLink) {
        const actorData = duplicate(t.actorData);
        actorData.type = token.actor?.type;
        const update = await migrateActorData(actorData as any); // TODO fix type
        ["items", "effects"].forEach((embeddedName: string) => {
          if (!(update as any)[embeddedName]?.length) {
            // TODO fix type
            return;
          }
          const updates = new Map((update as any)[embeddedName].map((u: any) => [u._id, u])); // TODO fix type
          (t.actorData as any)[embeddedName].forEach((original: any) => {
            // TODO fix type
            const update: any = updates.get(original._id);
            if (update) {
              mergeObject(original, update);
            }
          });

          delete (update as any)[embeddedName]; // TODO fix type
        });

        // TODO implement AE Delete for scene Actors as well?

        mergeObject(t.actorData, update);
      }
      return t;
    })
  );
  return { tokens };
}
