import { localize } from "../util";
import { RqgItem } from "@items/rqgItem.ts";
import { systemId } from "../config";
import { type RqgActorDataSource } from "../../data-model/actor-data/rqgActorData.ts";
import type { RqgActor } from "@actors/rqgActor.ts";

export type ItemMigration = (
  itemData: RqgItem,
  owningActorData?: RqgActor,
) => Promise<Item.UpdateData>;
export type ActorMigration = (actorData: RqgActorDataSource) => Actor.UpdateData;

export async function applyMigrations(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
): Promise<void> {
  console.time("RQG | ⏱ World Migrations took (ms)");
  await migrateWorldActors(itemMigrations, actorMigrations);
  await migrateWorldItems(itemMigrations);
  await migrateWorldScenes(itemMigrations, actorMigrations);
  await migrateWorldCompendiumPacks(itemMigrations, actorMigrations);
  console.timeEnd("RQG | ⏱ World Migrations took (ms)");
}

async function migrateWorldActors(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
): Promise<void> {
  const actorArray = game.actors?.contents;
  const actorCount = actorArray?.length ?? 0;
  const migrationMsg = localize("RQG.Migration.actors", {
    count: actorCount.toString(),
  });
  if (!actorArray || actorCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, actorCount, migrationMsg);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const actor of actorArray) {
    try {
      const updates = await getActorMigrationUpdates(
        actor.toObject() as any,
        itemMigrations,
        actorMigrations,
      );
      if (!foundry.utils.isEmpty(updates)) {
        console.log(`RQG | Migrating Actor document ${actor.name}`, updates);
        // @ts-expect-error enforceTypes TODO it does exists
        await actor.update(updates, { enforceTypes: false });
      }
      updateProgressBar(++progress, actorCount, migrationMsg);
    } catch (err: any) {
      err.message = `RQG | Failed system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err, actor);
    }
  }
  updateProgressBar(actorCount, actorCount, migrationMsg);
}

async function migrateWorldItems(itemMigrations: ItemMigration[]): Promise<void> {
  const itemArray = game.items?.contents as RqgItem[] | undefined;
  const itemCount = itemArray?.length ?? 0;
  const migrationMsg = localize("RQG.Migration.items", {
    count: itemCount.toString(),
  });
  if (!itemArray || itemCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, itemArray.length, migrationMsg);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const item of itemArray) {
    try {
      const updateData = await getItemMigrationUpdates((item as any).toObject(), itemMigrations);
      if (!foundry.utils.isEmpty(updateData)) {
        console.log(`RQG | Migrating Item document ${item.name}`, updateData);
        // @ts-expect-error enforceTypes TODO it does exists
        await item.update(updateData, { enforceTypes: false });
        updateProgressBar(++progress, itemArray.length, migrationMsg);
      }
    } catch (err: any) {
      err.message = `RQG | Failed system migration for Item ${item.name}: ${err.message}`;
      console.error(err, item);
    }
  }
  updateProgressBar(itemArray.length, itemArray.length, migrationMsg);
}

async function migrateWorldScenes(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
): Promise<void> {
  const scenes = game.scenes?.contents;
  const scenesCount = scenes?.length ?? 0;
  const migrationMsg = localize("RQG.Migration.scenes", {
    count: scenesCount.toString(),
  });
  if (!scenes || scenesCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, scenesCount, migrationMsg);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const scene of scenes) {
    try {
      const updateData = await getSceneMigrationUpdates(scene, itemMigrations, actorMigrations);
      if (!foundry.utils.isEmpty(updateData)) {
        console.log(`RQG | Migrating Scene document ${scene.name}`, updateData);
        // @ts-expect-error enforceTypes TODO it does exists
        await scene.update(updateData, { enforceTypes: false });

        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actorData.
        scene.tokens.contents.forEach((t: any) => (t._actor = null));
        updateProgressBar(++progress, scenesCount, migrationMsg);
      }
    } catch (err: any) {
      err.message = `RQG | Failed system migration for Scene ${scene.name}: ${err.message}`;
      console.error(err, scene);
    }
  }
  updateProgressBar(scenesCount, scenesCount, migrationMsg);
}

async function migrateWorldCompendiumPacks(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
): Promise<void> {
  const packs = game.packs?.contents.filter((p) => p.metadata.packageName !== systemId) ?? []; // Exclude system packs
  const packsCount = packs.length;
  const migrationMsg = localize("RQG.Migration.compendiums", {
    count: packsCount.toString(),
  });
  if (packsCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, packsCount, migrationMsg);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const pack of packs) {
    if (pack.metadata.packageType !== "world") {
      continue;
    }
    if (!["Actor", "Item", "Scene"].includes(pack.metadata.type)) {
      continue;
    }
    await migrateCompendium(pack, itemMigrations, actorMigrations);
    updateProgressBar(++progress, packsCount, migrationMsg);
  }
  updateProgressBar(packsCount, packsCount, migrationMsg);
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Documents within a single Compendium pack
 */
async function migrateCompendium(
  pack: CompendiumCollection.Any,
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
): Promise<void> {
  const documentType: string = pack.metadata.type;
  if (!["Actor", "Item", "Scene"].includes(documentType)) {
    return;
  }

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate();
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const doc of documents) {
    let updateData = {};
    try {
      switch (documentType) {
        case "Actor":
          updateData = await getActorMigrationUpdates(
            doc as RqgActor,
            itemMigrations,
            actorMigrations,
          );
          break;
        case "Item":
          updateData = await getItemMigrationUpdates(doc as RqgItem, itemMigrations);
          break;
        case "Scene":
          updateData = await getSceneMigrationUpdates(
            doc as Scene,
            itemMigrations,
            actorMigrations,
          );
          break;
      }

      // Save the entry, if data was changed
      if (foundry.utils.isEmpty(updateData)) {
        continue;
      }
      console.log(
        `RQG | Migrating ${documentType} document ${doc.name} in Compendium ${pack.collection}`,
        updateData,
      );
      await doc.update(updateData);
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
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */
async function getActorMigrationUpdates(
  actorData: RqgActor,
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
): Promise<Actor.UpdateData> {
  let updateData: Actor.UpdateData = {};
  actorMigrations.forEach((fn: (actorData: RqgActorDataSource) => Actor.UpdateData) => {
    // Merge in the updates
    updateData = updateData = foundry.utils.mergeObject(updateData, fn(actorData as any), {
      performDeletions: false,
    }) as Actor.UpdateData;
  });

  // Migrate Owned Items
  if (actorData.items) {
    let hasItemUpdates = false;
    const items = await Promise.all(
      actorData.items.map(async (item: any) => {
        const itemUpdate = await getItemMigrationUpdates(item, itemMigrations, actorData); // item is already `item.toObject()`

        // Update the Owned Item
        if (!foundry.utils.isEmpty(itemUpdate)) {
          hasItemUpdates = true;
          return foundry.utils.mergeObject(item, itemUpdate, {
            performDeletions: false,
            enforceTypes: false,
            inplace: false,
          });
        } else {
          return item;
        }
      }),
    );
    if (hasItemUpdates) {
      updateData.items = items;
    }
  }
  return updateData;
}

/* -------------------------------------------- */

async function getItemMigrationUpdates(
  item: RqgItem,
  itemMigrations: ItemMigration[],
  owningActor?: RqgActor,
): Promise<Item.UpdateData> {
  let updateData: Item.UpdateData = {};
  for (const fn of itemMigrations) {
    updateData = foundry.utils.mergeObject(updateData, await fn(item, owningActor), {
      performDeletions: false,
    }) as Item.UpdateData; // TODO can mergeObject be made to return the correct type?
  }
  return updateData;
}

/* -------------------------------------------- */

async function getSceneMigrationUpdates(
  scene: Scene,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  itemMigrations: ItemMigration[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  actorMigrations: ActorMigration[],
): Promise<object> {
  const tokens = await Promise.all(
    scene.tokens.map(async (token) => {
      const t = token.toJSON();
      // TODO fix it

      // if (!t.actorId || t.actorLink) {
      //   t.actorData = {}; // TODO what is actorData? does not seem to exist, use token.actor instead?
      // } else if (!game.actors!.has(t.actorId)) {
      //   t.actorId = null;
      //   t.actorData = {};
      // } else if (!t.actorLink) {
      //   const actorData = foundry.utils.duplicate(t.actorData);
      //   actorData.type = token.actor?.type;
      //   const update = await getActorMigrationUpdates(
      //     actorData as any,
      //     itemMigrations,
      //     actorMigrations,
      //   ); // TODO fix type
      //   ["items", "effects"].forEach((embeddedName: string) => {
      //     if (!(update as any)[embeddedName]?.length) {
      //       // TODO fix type
      //       return;
      //     }
      //     const updates = new Map((update as any)[embeddedName].map((u: any) => [u._id, u])); // TODO fix type
      //     (t.actorData as any)[embeddedName].forEach((original: any) => {
      //       // TODO fix type
      //       const update: any = updates.get(original._id);
      //       if (update) {
      //         foundry.utils.mergeObject(original, update, { performDeletions: false });
      //       }
      //     });
      //
      //     delete (update as any)[embeddedName]; // TODO fix type
      //   });
      //
      //   // TODO implement AE Delete for scene Actors as well?
      //   foundry.utils.mergeObject(t.actorData, update, { performDeletions: false });
      // }
      return t;
    }),
  );
  return { tokens };
}

let progressBar: any;

function updateProgressBar(index: number, totalCount: number, prefix: string = ""): void {
  const total = totalCount || 1; // Avoid division by zero
  const progress = Math.ceil((100 * index) / total);
  const pct = Math.round(progress) / 100;
  const message = `${prefix} ${index} / ${totalCount}`;

  if (!progressBar?.active) {
    progressBar = ui.notifications?.info(message, { progress: true });
  }
  progressBar.update({ message, pct });

  if (index === totalCount) {
    progressBar?.remove();
  }
}
