import { localize } from "../util";
import { RqgItem } from "@items/rqgItem.ts";
import { systemId } from "../config";
import type { RqgActor } from "@actors/rqgActor.ts";

export type ItemMigration = (
  itemData: RqgItem,
  owningActorData?: RqgActor,
) => Promise<Item.UpdateData>;
export type ActorMigration = (actorData: RqgActor) => Actor.UpdateData;

interface ActorMigrationResult {
  actorUpdateData: Actor.UpdateData;
  itemUpdateData: Item.UpdateData[];
}

export interface MigrationResult {
  errorCount: number;
}

export async function applyMigrations(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationNotification?: any,
): Promise<MigrationResult> {
  const migrationResult: MigrationResult = {
    errorCount: 0,
  };
  progressBar = migrationNotification;
  removeProgressBarOnComplete = !migrationNotification;
  console.time("RQG | ⏱ World Migrations took (ms)");
  await migrateWorldActors(itemMigrations, actorMigrations, migrationResult);
  await migrateWorldItems(itemMigrations, migrationResult);
  await migrateWorldScenes(itemMigrations, actorMigrations, migrationResult);
  await migrateWorldCompendiumPacks(itemMigrations, actorMigrations, migrationResult);
  console.timeEnd("RQG | ⏱ World Migrations took (ms)");

  if (!migrationNotification) {
    progressBar = undefined;
  }

  return migrationResult;
}

async function migrateWorldActors(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationResult: MigrationResult,
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
  updateProgressBar(progress, actorCount, migrationMsg, 0, 0.25, 120);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const actor of actorArray) {
    try {
      const { actorUpdateData, itemUpdateData } = await getActorMigrationUpdates(
        actor.toObject() as any,
        itemMigrations,
        actorMigrations,
      );
      if (!foundry.utils.isEmpty(actorUpdateData)) {
        console.log(`RQG | Migrating Actor document ${actor.name}`, actorUpdateData);
        // @ts-expect-error enforceTypes TODO it does exists
        await actor.update(actorUpdateData, { enforceTypes: false });
      }

      if (itemUpdateData.length > 0) {
        console.log(
          `RQG | Migrating embedded Items for Actor document ${actor.name}`,
          itemUpdateData,
        );
        await actor.updateEmbeddedDocuments("Item", itemUpdateData);
      }
    } catch (err: any) {
      migrationResult.errorCount += 1;
      err.message = `RQG | Failed system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err, actor);
    } finally {
      updateProgressBar(++progress, actorCount, migrationMsg, 0, 0.25, 120);
    }
  }
  updateProgressBar(actorCount, actorCount, migrationMsg, 0, 0.25, 120);
}

async function migrateWorldItems(
  itemMigrations: ItemMigration[],
  migrationResult: MigrationResult,
): Promise<void> {
  const itemArray = game.items?.contents as RqgItem[] | undefined;
  const itemCount = itemArray?.length ?? 0;
  const migrationMsg = localize("RQG.Migration.items", {
    count: itemCount.toString(),
  });
  if (!itemArray || itemCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, itemArray.length, migrationMsg, 0.25, 0.5, 45);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const item of itemArray) {
    try {
      const updateData = await getItemMigrationUpdates((item as any).toObject(), itemMigrations);
      if (!foundry.utils.isEmpty(updateData)) {
        console.log(`RQG | Migrating Item document ${item.name}`, updateData);
        // @ts-expect-error enforceTypes TODO it does exists
        await item.update(updateData, { enforceTypes: false });
      }
    } catch (err: any) {
      migrationResult.errorCount += 1;
      err.message = `RQG | Failed system migration for Item ${item.name}: ${err.message}`;
      console.error(err, item);
    } finally {
      updateProgressBar(++progress, itemCount, migrationMsg, 0.25, 0.5, 45);
    }
  }
  updateProgressBar(itemCount, itemCount, migrationMsg, 0.25, 0.5, 45);
}

async function migrateWorldScenes(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationResult: MigrationResult,
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
  updateProgressBar(progress, scenesCount, migrationMsg, 0.5, 0.75, 180);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const scene of scenes) {
    try {
      await migrateSceneTokenActors(scene, itemMigrations, actorMigrations, migrationResult);
    } catch (err: any) {
      migrationResult.errorCount += 1;
      err.message = `RQG | Failed system migration for Scene ${scene.name}: ${err.message}`;
      console.error(err, scene);
    } finally {
      updateProgressBar(++progress, scenesCount, migrationMsg, 0.5, 0.75, 180);
    }
  }
  updateProgressBar(scenesCount, scenesCount, migrationMsg, 0.5, 0.75, 180);
}

async function migrateWorldCompendiumPacks(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationResult: MigrationResult,
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
  updateProgressBar(progress, packsCount, migrationMsg, 0.75, 1, 350);
  console.log(`%cRQG | ${migrationMsg}`, "font-size: 16px");
  for (const pack of packs) {
    try {
      if (pack.metadata.packageType !== "world") {
        continue;
      }
      if (!["Actor", "Item", "Scene"].includes(pack.metadata.type)) {
        continue;
      }
      await migrateCompendium(pack, itemMigrations, actorMigrations, migrationResult);
    } catch (err: any) {
      migrationResult.errorCount += 1;
      err.message = `RQG | Failed migration for Compendium ${pack.collection}: ${err.message}`;
      console.error(err, pack);
    } finally {
      updateProgressBar(++progress, packsCount, migrationMsg, 0.75, 1, 350);
    }
  }
  updateProgressBar(packsCount, packsCount, migrationMsg, 0.75, 1, 350);
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Documents within a single Compendium pack
 */
async function migrateCompendium(
  pack: CompendiumCollection.Any,
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationResult: MigrationResult,
): Promise<void> {
  const documentType: string = pack.metadata.type;
  if (!["Actor", "Item", "Scene"].includes(documentType)) {
    return;
  }

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate({ notify: false });
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const doc of documents) {
    let updateData = {};
    try {
      switch (documentType) {
        case "Actor": {
          const { actorUpdateData, itemUpdateData } = await getActorMigrationUpdates(
            doc as RqgActor,
            itemMigrations,
            actorMigrations,
          );

          if (!foundry.utils.isEmpty(actorUpdateData)) {
            console.log(
              `RQG | Migrating Actor document ${doc.name} in Compendium ${pack.collection}`,
              actorUpdateData,
            );
            await (doc as any).update(actorUpdateData as any);
          }

          if (itemUpdateData.length > 0) {
            console.log(
              `RQG | Migrating embedded Items for Actor document ${doc.name} in Compendium ${pack.collection}`,
              itemUpdateData,
            );
            await (doc as RqgActor).updateEmbeddedDocuments("Item", itemUpdateData);
          }

          updateData = {};
          break;
        }
        case "Item":
          updateData = await getItemMigrationUpdates(doc as RqgItem, itemMigrations);
          break;
        case "Scene":
          await migrateSceneTokenActors(
            doc as Scene,
            itemMigrations,
            actorMigrations,
            migrationResult,
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
      migrationResult.errorCount += 1;
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
): Promise<ActorMigrationResult> {
  let actorUpdateData: Actor.UpdateData = {};
  const itemUpdateData: Item.UpdateData[] = [];

  actorMigrations.forEach((fn: (actorData: RqgActor) => Actor.UpdateData) => {
    actorUpdateData = foundry.utils.mergeObject(actorUpdateData, fn(actorData as any), {
      performDeletions: false,
    }) as Actor.UpdateData;
  });

  if ("items" in (actorUpdateData as Record<string, unknown>)) {
    console.warn(
      `RQG | Actor migration returned actor-level items update for ${actorData.name}; ignoring items and using embedded item migrations instead.`,
    );
    delete (actorUpdateData as Record<string, unknown>)["items"];
  }

  // Migrate Owned Items
  if (actorData.items) {
    const rawActorItems = (actorData as any).items;
    const actorItems: any[] = Array.isArray(rawActorItems)
      ? rawActorItems
      : Array.from(rawActorItems?.values?.() ?? []);

    for (const item of actorItems) {
      const itemUpdate = await getItemMigrationUpdates(item, itemMigrations, actorData);
      if (foundry.utils.isEmpty(itemUpdate)) {
        continue;
      }

      const itemId = item._id ?? item.id;
      if (!itemId) {
        continue;
      }

      itemUpdateData.push({
        _id: itemId,
        ...itemUpdate,
      });
    }
  }

  return {
    actorUpdateData,
    itemUpdateData,
  };
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

/**
 * Migrate unlinked token actors in a scene by applying the same item/actor
 * migrations used for world actors. Linked tokens are skipped — they share
 * the world actor already handled in migrateWorldActors.
 */
async function migrateSceneTokenActors(
  scene: Scene,
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationResult: MigrationResult,
): Promise<void> {
  for (const token of scene.tokens) {
    if (token.actorLink) {
      continue;
    }
    const actor = token.actor;
    if (!actor) {
      continue;
    }

    try {
      const { actorUpdateData, itemUpdateData } = await getActorMigrationUpdates(
        actor.toObject() as any,
        itemMigrations,
        actorMigrations,
      );

      if (!foundry.utils.isEmpty(actorUpdateData)) {
        console.log(
          `RQG | Migrating unlinked Token actor ${actor.name} in Scene ${scene.name}`,
          actorUpdateData,
        );
        // @ts-expect-error enforceTypes TODO it does exist
        await actor.update(actorUpdateData, { enforceTypes: false });
      }

      if (itemUpdateData.length > 0) {
        console.log(
          `RQG | Migrating embedded Items for unlinked Token actor ${actor.name} in Scene ${scene.name}`,
          itemUpdateData,
        );
        await actor.updateEmbeddedDocuments("Item", itemUpdateData);
      }
    } catch (err: any) {
      migrationResult.errorCount += 1;
      err.message = `RQG | Failed migration for Token actor ${actor.name} in Scene ${scene.name}: ${err.message}`;
      console.error(err, token);
    }
  }
}

let progressBar: any;
let removeProgressBarOnComplete = true;
let phaseTimingKey = "";
let phaseTimingStart = 0;

function updateProgressBar(
  index: number,
  totalCount: number,
  prefix: string = "",
  phaseStartPct = 0,
  phaseEndPct = 1,
  expectedUnitMs = 100,
): void {
  const total = totalCount || 1; // Avoid division by zero
  const now = Date.now();
  const currentPhaseKey = `${prefix}|${phaseStartPct}|${phaseEndPct}`;
  if (phaseTimingKey !== currentPhaseKey) {
    phaseTimingKey = currentPhaseKey;
    phaseTimingStart = now;
  }

  const countProgress = Math.max(0, Math.min(1, index / total));
  const expectedPhaseMs = Math.max(1000, total * expectedUnitMs);
  const elapsedPhaseMs = Math.max(0, now - phaseTimingStart);
  const rawTimeProgress = Math.max(0, Math.min(1, elapsedPhaseMs / expectedPhaseMs));
  const timeProgress = index >= total ? 1 : Math.min(rawTimeProgress, 0.98);
  const phaseProgress = Math.max(countProgress, timeProgress);
  const pct = phaseStartPct + (phaseEndPct - phaseStartPct) * phaseProgress;
  const message = `${prefix} ${index} / ${totalCount}`;

  if (!progressBar) {
    progressBar = ui.notifications?.info(message, { progress: true });
  }

  progressBar?.update?.({ message, pct });

  if (index === totalCount && removeProgressBarOnComplete) {
    progressBar?.remove();
    progressBar = undefined;
  }
}
