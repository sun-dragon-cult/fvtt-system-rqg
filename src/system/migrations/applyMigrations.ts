import { localize } from "../util";
import { RqgItem } from "@items/rqgItem.ts";
import { systemId } from "../config";
import type { RqgActor } from "@actors/rqgActor.ts";
import { MigrationLogger } from "../logging/migrationLogger";
import { RqgLogger } from "../logging/rqgLogger";

const applyMigrationsLogger = new RqgLogger("Migration");

export type ItemMigration = (
  itemData: RqgItem,
  owningActorData?: RqgActor,
  logger?: MigrationLogger,
) => Promise<Item.UpdateData>;
export type ActorMigration = (actorData: RqgActor, logger?: MigrationLogger) => Actor.UpdateData;
export type ActiveEffectMigration = (
  effectData: ActiveEffect.Implementation,
  logger?: MigrationLogger,
) => Promise<ActiveEffect.UpdateData>;

interface ActorMigrationResult {
  actorUpdateData: Actor.UpdateData;
  itemUpdateData: Item.UpdateData[];
}

export type MigrationLogLevel = "info" | "warn" | "error";

export interface MigrationDocumentLink {
  kind:
    | "Actor"
    | "Item"
    | "Scene"
    | "ActiveEffect"
    | "JournalEntry"
    | "JournalEntryPage"
    | "Compendium";
  uuid: string;
  label: string;
}

export interface MigrationLogEntry {
  level: MigrationLogLevel;
  message: string;
  documents?: MigrationDocumentLink[];
}

export interface MigrationStats {
  worldActorsInspected: number;
  worldItemsInspected: number;
  scenesInspected: number;
  unlinkedTokenActorsInspected: number;
  compendiumsInspected: number;
  compendiumsSkippedByDesign: number;
  compendiumDocumentsInspected: number;
}

export interface MigrationResult {
  errorCount: number;
  warningCount: number;
  logCount: number;
  logEntries: MigrationLogEntry[];
  stats: MigrationStats;
}

export async function applyMigrations(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationNotification?: any,
  activeEffectMigrations: ActiveEffectMigration[] = [],
): Promise<MigrationResult> {
  const migrationResult: MigrationResult = {
    errorCount: 0,
    warningCount: 0,
    logCount: 0,
    logEntries: [],
    stats: {
      worldActorsInspected: 0,
      worldItemsInspected: 0,
      scenesInspected: 0,
      unlinkedTokenActorsInspected: 0,
      compendiumsInspected: 0,
      compendiumsSkippedByDesign: 0,
      compendiumDocumentsInspected: 0,
    },
  };

  const logger = new MigrationLogger(migrationResult);
  const timingLogger = new RqgLogger("applyMigrations");
  progressBar = migrationNotification;
  removeProgressBarOnComplete = !migrationNotification;
  const worldMigrationsTiming = timingLogger.time("World Migrations took (ms)");
  try {
    await migrateWorldActors(itemMigrations, actorMigrations, migrationResult, logger);
    await migrateWorldItems(itemMigrations, migrationResult, logger);
    await migrateWorldScenes(itemMigrations, actorMigrations, migrationResult, logger);
    await migrateWorldCompendiumPacks(
      itemMigrations,
      actorMigrations,
      activeEffectMigrations,
      migrationResult,
      logger,
    );
  } finally {
    worldMigrationsTiming.timeEnd();
  }

  if (!migrationNotification) {
    progressBar = undefined;
  }

  migrationResult.warningCount = migrationResult.logEntries.filter(
    (e) => e.level === "warn",
  ).length;
  migrationResult.logCount = migrationResult.logEntries.length;

  return migrationResult;
}

async function migrateWorldActors(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  migrationResult: MigrationResult,
  logger: MigrationLogger,
): Promise<void> {
  const actorArray = game.actors?.contents;
  const actorCount = actorArray?.length ?? 0;
  migrationResult.stats.worldActorsInspected = actorCount;
  const migrationMsg = localize("RQG.Migration.actors", {
    count: actorCount.toString(),
  });
  if (!actorArray || actorCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, actorCount, migrationMsg, 0, 0.25, 120);
  logger.info(migrationMsg);
  for (const actor of actorArray) {
    try {
      const { actorUpdateData, itemUpdateData } = await getActorMigrationUpdates(
        actor as unknown as RqgActor,
        itemMigrations,
        actorMigrations,
        logger,
      );
      if (!foundry.utils.isEmpty(actorUpdateData)) {
        logger.info(`Migrating Actor document ${actor.name}`);
        // @ts-expect-error enforceTypes TODO it does exists
        await actor.update(actorUpdateData, { enforceTypes: false });
      }

      if (itemUpdateData.length > 0) {
        logger.info(`Migrating embedded Items for Actor document ${actor.name}`);
        await actor.updateEmbeddedDocuments("Item", itemUpdateData);
      }
    } catch (err: any) {
      migrationResult.errorCount += 1;
      logger.error(
        `Failed system migration for Actor ${actor.name}: ${err instanceof Error ? err.message : String(err)}`,
        { documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }] },
      );
    } finally {
      updateProgressBar(++progress, actorCount, migrationMsg, 0, 0.25, 120);
    }
  }
  updateProgressBar(actorCount, actorCount, migrationMsg, 0, 0.25, 120);
}

async function migrateWorldItems(
  itemMigrations: ItemMigration[],
  migrationResult: MigrationResult,
  logger: MigrationLogger,
): Promise<void> {
  const itemArray = game.items?.contents as RqgItem[] | undefined;
  const itemCount = itemArray?.length ?? 0;
  migrationResult.stats.worldItemsInspected = itemCount;
  const migrationMsg = localize("RQG.Migration.items", {
    count: itemCount.toString(),
  });
  if (!itemArray || itemCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, itemArray.length, migrationMsg, 0.25, 0.5, 45);
  logger.info(migrationMsg);
  for (const item of itemArray) {
    try {
      const updateData = await getItemMigrationUpdates(
        item as unknown as RqgItem,
        itemMigrations,
        undefined,
        logger,
      );
      if (!foundry.utils.isEmpty(updateData)) {
        logger.info(`Migrating Item document ${item.name}`);
        // @ts-expect-error enforceTypes TODO it does exists
        await item.update(updateData, { enforceTypes: false });
      }
    } catch (err: any) {
      migrationResult.errorCount += 1;
      logger.error(
        `Failed system migration for Item ${item.name}: ${err instanceof Error ? err.message : String(err)}`,
        { documents: [{ kind: "Item", uuid: item.uuid, label: item.name }] },
      );
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
  logger: MigrationLogger,
): Promise<void> {
  const scenes = game.scenes?.contents;
  const scenesCount = scenes?.length ?? 0;
  migrationResult.stats.scenesInspected = scenesCount;
  const migrationMsg = localize("RQG.Migration.scenes", {
    count: scenesCount.toString(),
  });
  if (!scenes || scenesCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, scenesCount, migrationMsg, 0.5, 0.75, 180);
  logger.info(migrationMsg);
  for (const scene of scenes) {
    try {
      await migrateSceneTokenActors(
        scene,
        itemMigrations,
        actorMigrations,
        migrationResult,
        logger,
      );
    } catch (err: any) {
      migrationResult.errorCount += 1;
      logger.error(
        `Failed system migration for Scene ${scene.name}: ${err instanceof Error ? err.message : String(err)}`,
        { documents: [{ kind: "Scene", uuid: scene.uuid, label: scene.name }] },
      );
    } finally {
      updateProgressBar(++progress, scenesCount, migrationMsg, 0.5, 0.75, 180);
    }
  }
  updateProgressBar(scenesCount, scenesCount, migrationMsg, 0.5, 0.75, 180);
}

async function migrateWorldCompendiumPacks(
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  activeEffectMigrations: ActiveEffectMigration[],
  migrationResult: MigrationResult,
  logger: MigrationLogger,
): Promise<void> {
  const allPacks = game.packs?.contents ?? [];
  const packs = allPacks.filter((pack) => {
    if (pack.metadata.packageName === systemId) {
      return false;
    }
    if (pack.metadata.packageType !== "world") {
      return false;
    }
    return ["Actor", "Item", "Scene", "ActiveEffect"].includes(pack.metadata.type);
  });
  migrationResult.stats.compendiumsSkippedByDesign = allPacks.length - packs.length;
  const packsCount = packs.length;
  const migrationMsg = localize("RQG.Migration.compendiums", {
    count: packsCount.toString(),
  });
  if (packsCount === 0) {
    return;
  }
  let progress = 0;
  updateProgressBar(progress, packsCount, migrationMsg, 0.75, 1, 350);
  logger.info(migrationMsg);
  for (const pack of packs) {
    try {
      migrationResult.stats.compendiumsInspected += 1;
      await migrateCompendium(
        pack,
        itemMigrations,
        actorMigrations,
        activeEffectMigrations,
        migrationResult,
        logger,
      );
    } catch (err: any) {
      migrationResult.errorCount += 1;
      logger.error(
        `Failed migration for Compendium ${pack.collection}: ${err instanceof Error ? err.message : String(err)}`,
        {
          notify: false,
          documents: [
            {
              kind: "Compendium",
              uuid: `Compendium.${pack.collection}`,
              label: pack.metadata.label ?? pack.collection,
            },
          ],
        },
      );
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
  activeEffectMigrations: ActiveEffectMigration[],
  migrationResult: MigrationResult,
  logger: MigrationLogger,
): Promise<void> {
  const documentType: string = pack.metadata.type;
  if (!["Actor", "Item", "Scene", "ActiveEffect"].includes(documentType)) {
    return;
  }

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate({ notify: false });
  const documents = await pack.getDocuments();
  migrationResult.stats.compendiumDocumentsInspected += documents.length;

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
            logger,
          );

          if (!foundry.utils.isEmpty(actorUpdateData)) {
            logger.info(`Migrating Actor document ${doc.name} in Compendium ${pack.collection}`);
            await (doc as any).update(actorUpdateData as any);
          }

          if (itemUpdateData.length > 0) {
            logger.info(
              `Migrating embedded Items for Actor document ${doc.name} in Compendium ${pack.collection}`,
            );
            await (doc as RqgActor).updateEmbeddedDocuments("Item", itemUpdateData);
          }

          updateData = {};
          break;
        }
        case "Item":
          updateData = await getItemMigrationUpdates(
            doc as RqgItem,
            itemMigrations,
            undefined,
            logger,
          );
          break;
        case "ActiveEffect":
          updateData = await getActiveEffectMigrationUpdates(
            doc as unknown as ActiveEffect.Implementation,
            activeEffectMigrations,
            logger,
          );
          break;
        case "Scene":
          await migrateSceneTokenActors(
            doc as Scene,
            itemMigrations,
            actorMigrations,
            migrationResult,
            logger,
          );
          break;
      }

      // Save the entry, if data was changed
      if (foundry.utils.isEmpty(updateData)) {
        continue;
      }
      logger.info(
        `Migrating ${documentType} document ${doc.name} in Compendium ${pack.collection}`,
      );
      await doc.update(updateData);
    } catch (err: any) {
      migrationResult.errorCount += 1;
      logger.error(
        `Failed system migration for document ${doc.name} in pack ${pack.collection}: ${err instanceof Error ? err.message : String(err)}`,
        {
          documents: [
            {
              kind: "Compendium",
              uuid: `Compendium.${pack.collection}`,
              label: pack.metadata.label ?? pack.collection,
            },
          ],
        },
      );
    }
  }
  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  logger.info(`Migrated all ${documentType} documents from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */
async function getActorMigrationUpdates(
  actorData: RqgActor,
  itemMigrations: ItemMigration[],
  actorMigrations: ActorMigration[],
  logger?: MigrationLogger,
): Promise<ActorMigrationResult> {
  let actorUpdateData: Actor.UpdateData = {};
  const itemUpdateData: Item.UpdateData[] = [];

  actorMigrations.forEach((fn: ActorMigration) => {
    actorUpdateData = foundry.utils.mergeObject(actorUpdateData, fn(actorData as any, logger), {
      performDeletions: false,
    }) as Actor.UpdateData;
  });

  if ("items" in (actorUpdateData as Record<string, unknown>)) {
    applyMigrationsLogger.warn(
      `Actor migration returned actor-level items update for ${actorData.name}; ignoring items and using embedded item migrations instead.`,
      { notify: false },
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
      const itemUpdate = await getItemMigrationUpdates(item, itemMigrations, actorData, logger);
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
  logger?: MigrationLogger,
): Promise<Item.UpdateData> {
  let updateData: Item.UpdateData = {};
  for (const fn of itemMigrations) {
    updateData = foundry.utils.mergeObject(updateData, await fn(item, owningActor, logger), {
      performDeletions: false,
    }) as Item.UpdateData; // TODO can mergeObject be made to return the correct type?
  }

  return updateData;
}

/* -------------------------------------------- */

async function getActiveEffectMigrationUpdates(
  effect: ActiveEffect.Implementation,
  activeEffectMigrations: ActiveEffectMigration[],
  logger?: MigrationLogger,
): Promise<ActiveEffect.UpdateData> {
  let updateData: ActiveEffect.UpdateData = {};
  for (const fn of activeEffectMigrations) {
    updateData = foundry.utils.mergeObject(updateData, await fn(effect, logger), {
      performDeletions: false,
    }) as ActiveEffect.UpdateData;
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
  logger: MigrationLogger,
): Promise<void> {
  for (const token of scene.tokens) {
    if (token.actorLink) {
      continue;
    }
    const actor = token.actor;
    if (!actor) {
      continue;
    }

    migrationResult.stats.unlinkedTokenActorsInspected += 1;

    try {
      const { actorUpdateData, itemUpdateData } = await getActorMigrationUpdates(
        actor as unknown as RqgActor,
        itemMigrations,
        actorMigrations,
        logger,
      );

      if (!foundry.utils.isEmpty(actorUpdateData)) {
        logger.info(`Migrating unlinked Token actor ${actor.name} in Scene ${scene.name}`);
        // @ts-expect-error enforceTypes TODO it does exist
        await actor.update(actorUpdateData, { enforceTypes: false });
      }

      if (itemUpdateData.length > 0) {
        logger.info(
          `Migrating embedded Items for unlinked Token actor ${actor.name} in Scene ${scene.name}`,
        );
        await actor.updateEmbeddedDocuments("Item", itemUpdateData);
      }
    } catch (err: any) {
      migrationResult.errorCount += 1;
      logger.error(
        `Failed migration for Token actor ${actor.name} in Scene ${scene.name}: ${err instanceof Error ? err.message : String(err)}`,
        {
          documents: [
            { kind: "Actor", uuid: actor.uuid, label: actor.name },
            { kind: "Scene", uuid: scene.uuid, label: scene.name },
          ],
        },
      );
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
