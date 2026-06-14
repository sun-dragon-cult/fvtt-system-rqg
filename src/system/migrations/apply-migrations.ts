import { localize } from "../util";
import { RqgItem } from "@items/rqg-item.ts";
import { systemId } from "../config";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { MigrationLogger } from "../logging/migration-logger";
import { RqgLogger } from "../logging/rqg-logger";

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
  actorMigrationNames: string[];
  itemMigrationNames: string[];
}

interface ItemMigrationResult {
  updateData: Item.UpdateData;
  migrationNames: string[];
}

interface ActiveEffectMigrationResult {
  updateData: ActiveEffect.UpdateData;
  migrationNames: string[];
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
  uuid: string | null;
  label: string;
}

export interface MigrationChangeRow {
  key: string;
  previousValue: string;
  newValue: string;
  diffLines: MigrationDiffLine[];
}

export interface MigrationDiffLine {
  kind: "added" | "removed" | "changed";
  value: string;
}

export interface MigrationLogEntry {
  level: MigrationLogLevel;
  message: string;
  migrationName?: string;
  documents?: MigrationDocumentLink[];
  changes?: MigrationChangeRow[];
  hiddenChangeCount?: number;
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
      const actorSource = getDocumentSourceObject(actor);
      const { actorUpdateData, itemUpdateData, actorMigrationNames, itemMigrationNames } =
        await getActorMigrationUpdates(
          actor as unknown as RqgActor,
          itemMigrations,
          actorMigrations,
          logger,
        );
      if (!foundry.utils.isEmpty(actorUpdateData)) {
        const actorChangeSummary = describeDocumentChanges(actorSource, actorUpdateData);
        const actorMigrationName = summarizeMigrationNames(actorMigrationNames);
        logger.info(`Migrating Actor document ${actor.name}`, {
          documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }],
          ...(actorMigrationName ? { migrationName: actorMigrationName } : {}),
          changes: actorChangeSummary.changeRows,
          hiddenChangeCount: actorChangeSummary.hiddenChangeCount,
        });
        // @ts-expect-error enforceTypes TODO it does exists
        await actor.update(actorUpdateData, { enforceTypes: false });
      }

      if (itemUpdateData.length > 0) {
        const actorEmbeddedItemsSource = getEmbeddedItemsSource(actorSource, actor.items.contents);
        const itemChangeSummary = describeEmbeddedDocumentChanges(
          actorEmbeddedItemsSource,
          itemUpdateData,
        );
        const itemMigrationName = summarizeMigrationNames(itemMigrationNames);
        logger.info(`Migrating embedded Items for Actor document ${actor.name}`, {
          documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }],
          ...(itemMigrationName ? { migrationName: itemMigrationName } : {}),
          changes: itemChangeSummary.changeRows,
          hiddenChangeCount: itemChangeSummary.hiddenChangeCount,
        });
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
      const itemSource = getDocumentSourceObject(item);
      const { updateData, migrationNames } = await getItemMigrationUpdates(
        item as unknown as RqgItem,
        itemMigrations,
        undefined,
        logger,
      );
      if (!foundry.utils.isEmpty(updateData)) {
        const itemChangeSummary = describeDocumentChanges(itemSource, updateData);
        const migrationName = summarizeMigrationNames(migrationNames);
        logger.info(`Migrating Item document ${item.name}`, {
          documents: [{ kind: "Item", uuid: item.uuid, label: item.name }],
          ...(migrationName ? { migrationName } : {}),
          changes: itemChangeSummary.changeRows,
          hiddenChangeCount: itemChangeSummary.hiddenChangeCount,
        });
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
    let migrationNames: string[] = [];
    try {
      const docSource = getDocumentSourceObject(doc);
      switch (documentType) {
        case "Actor": {
          const { actorUpdateData, itemUpdateData, actorMigrationNames, itemMigrationNames } =
            await getActorMigrationUpdates(
              doc as RqgActor,
              itemMigrations,
              actorMigrations,
              logger,
            );

          if (!foundry.utils.isEmpty(actorUpdateData)) {
            const actorChangeSummary = describeDocumentChanges(docSource, actorUpdateData);
            const actorMigrationName = summarizeMigrationNames(actorMigrationNames);
            logger.info(`Migrating Actor document ${doc.name} in Compendium ${pack.collection}`, {
              documents: [{ kind: "Actor", uuid: doc.uuid, label: doc.name }],
              ...(actorMigrationName ? { migrationName: actorMigrationName } : {}),
              changes: actorChangeSummary.changeRows,
              hiddenChangeCount: actorChangeSummary.hiddenChangeCount,
            });
            await (doc as any).update(actorUpdateData as any);
          }

          if (itemUpdateData.length > 0) {
            const actorEmbeddedItemsSource = getEmbeddedItemsSource(
              docSource,
              (doc as RqgActor).items.contents,
            );
            const itemChangeSummary = describeEmbeddedDocumentChanges(
              actorEmbeddedItemsSource,
              itemUpdateData,
            );
            const itemMigrationName = summarizeMigrationNames(itemMigrationNames);
            logger.info(
              `Migrating embedded Items for Actor document ${doc.name} in Compendium ${pack.collection}`,
              {
                documents: [{ kind: "Actor", uuid: doc.uuid, label: doc.name }],
                ...(itemMigrationName ? { migrationName: itemMigrationName } : {}),
                changes: itemChangeSummary.changeRows,
                hiddenChangeCount: itemChangeSummary.hiddenChangeCount,
              },
            );
            await (doc as RqgActor).updateEmbeddedDocuments("Item", itemUpdateData);
          }

          updateData = {};
          break;
        }
        case "Item":
          {
            const itemMigrationResult = await getItemMigrationUpdates(
              doc as RqgItem,
              itemMigrations,
              undefined,
              logger,
            );
            updateData = itemMigrationResult.updateData;
            migrationNames = itemMigrationResult.migrationNames;
          }
          break;
        case "ActiveEffect":
          {
            const activeEffectMigrationResult = await getActiveEffectMigrationUpdates(
              doc as unknown as ActiveEffect.Implementation,
              activeEffectMigrations,
              logger,
            );
            updateData = activeEffectMigrationResult.updateData;
            migrationNames = activeEffectMigrationResult.migrationNames;
          }
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
      const documentKind = getMigrationDocumentKind(documentType);
      const documentChangeSummary = describeDocumentChanges(docSource, updateData);
      const migrationName = summarizeMigrationNames(migrationNames);
      logger.info(
        `Migrating ${documentType} document ${doc.name} in Compendium ${pack.collection}`,
        {
          documents: documentKind ? [{ kind: documentKind, uuid: doc.uuid, label: doc.name }] : [],
          ...(migrationName ? { migrationName } : {}),
          changes: documentChangeSummary.changeRows,
          hiddenChangeCount: documentChangeSummary.hiddenChangeCount,
        },
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
  logger.info(`Migrated all ${documentType} documents from Compendium ${pack.collection}`, {
    documents: [
      {
        kind: "Compendium",
        uuid: `Compendium.${pack.collection}`,
        label: pack.metadata.label ?? pack.collection,
      },
    ],
  });
}

function getMigrationDocumentKind(
  documentType: string,
): Extract<MigrationDocumentLink["kind"], "Actor" | "Item" | "Scene" | "ActiveEffect"> | undefined {
  switch (documentType) {
    case "Actor":
    case "Item":
    case "Scene":
    case "ActiveEffect":
      return documentType;
    default:
      return undefined;
  }
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
  const actorSourceData = getDocumentSourceObject(actorData);
  let actorUpdateData: Actor.UpdateData = {};
  const itemUpdateData: Item.UpdateData[] = [];
  const actorMigrationNames = new Set<string>();
  const itemMigrationNames = new Set<string>();

  actorMigrations.forEach((fn: ActorMigration) => {
    const migrationName = getMigrationFunctionName(fn);
    const scopedLogger = logger?.withMigration(migrationName);
    const fnUpdate = fn(actorData as any, scopedLogger);
    if (!foundry.utils.isEmpty(pruneNoopUpdateData(fnUpdate, actorSourceData))) {
      actorMigrationNames.add(migrationName);
    }
    actorUpdateData = foundry.utils.mergeObject(actorUpdateData, fnUpdate, {
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

  actorUpdateData = pruneNoopUpdateData(actorUpdateData, actorSourceData);

  // Migrate Owned Items
  if (actorData.items) {
    const rawActorItems = (actorData as any).items;
    const actorItems: any[] = Array.isArray(rawActorItems)
      ? rawActorItems
      : Array.from(rawActorItems?.values?.() ?? []);

    for (const item of actorItems) {
      const { updateData: itemUpdate, migrationNames } = await getItemMigrationUpdates(
        item,
        itemMigrations,
        actorData,
        logger,
      );
      if (foundry.utils.isEmpty(itemUpdate) || isNoopEmbeddedDocumentUpdate(itemUpdate)) {
        continue;
      }

      for (const migrationName of migrationNames) {
        itemMigrationNames.add(migrationName);
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
    actorMigrationNames: Array.from(actorMigrationNames),
    itemMigrationNames: Array.from(itemMigrationNames),
  };
}

/* -------------------------------------------- */

async function getItemMigrationUpdates(
  item: RqgItem,
  itemMigrations: ItemMigration[],
  owningActor?: RqgActor,
  logger?: MigrationLogger,
): Promise<ItemMigrationResult> {
  const itemSourceData = getDocumentSourceObject(item);
  let updateData: Item.UpdateData = {};
  const migrationNames = new Set<string>();
  for (const fn of itemMigrations) {
    const migrationName = getMigrationFunctionName(fn);
    const scopedLogger = logger?.withMigration(migrationName);
    const fnUpdate = await fn(item, owningActor, scopedLogger);
    if (!foundry.utils.isEmpty(pruneNoopUpdateData(fnUpdate, itemSourceData))) {
      migrationNames.add(migrationName);
    }

    updateData = foundry.utils.mergeObject(updateData, fnUpdate, {
      performDeletions: false,
    }) as Item.UpdateData; // TODO can mergeObject be made to return the correct type?
  }

  return {
    updateData: pruneNoopUpdateData(updateData, itemSourceData),
    migrationNames: Array.from(migrationNames),
  };
}

/* -------------------------------------------- */

async function getActiveEffectMigrationUpdates(
  effect: ActiveEffect.Implementation,
  activeEffectMigrations: ActiveEffectMigration[],
  logger?: MigrationLogger,
): Promise<ActiveEffectMigrationResult> {
  const effectSourceData = getDocumentSourceObject(effect);
  let updateData: ActiveEffect.UpdateData = {};
  const migrationNames = new Set<string>();
  for (const fn of activeEffectMigrations) {
    const migrationName = getMigrationFunctionName(fn);
    const scopedLogger = logger?.withMigration(migrationName);
    const fnUpdate = await fn(effect, scopedLogger);
    if (!foundry.utils.isEmpty(pruneNoopUpdateData(fnUpdate, effectSourceData))) {
      migrationNames.add(migrationName);
    }

    updateData = foundry.utils.mergeObject(updateData, fnUpdate, {
      performDeletions: false,
    }) as ActiveEffect.UpdateData;
  }

  return {
    updateData: pruneNoopUpdateData(updateData, effectSourceData),
    migrationNames: Array.from(migrationNames),
  };
}

function isNoopEmbeddedDocumentUpdate(updateData: Item.UpdateData): boolean {
  return Object.keys(updateData as Record<string, unknown>).every((key) => key === "_id");
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
      const actorSource = getDocumentSourceObject(actor);
      const { actorUpdateData, itemUpdateData, actorMigrationNames, itemMigrationNames } =
        await getActorMigrationUpdates(
          actor as unknown as RqgActor,
          itemMigrations,
          actorMigrations,
          logger,
        );

      if (!foundry.utils.isEmpty(actorUpdateData)) {
        const actorChangeSummary = describeDocumentChanges(actorSource, actorUpdateData);
        const actorMigrationName = summarizeMigrationNames(actorMigrationNames);
        logger.info(`Migrating unlinked Token actor ${actor.name} in Scene ${scene.name}`, {
          documents: [
            { kind: "Actor", uuid: actor.uuid, label: actor.name },
            { kind: "Scene", uuid: scene.uuid, label: scene.name },
          ],
          ...(actorMigrationName ? { migrationName: actorMigrationName } : {}),
          changes: actorChangeSummary.changeRows,
          hiddenChangeCount: actorChangeSummary.hiddenChangeCount,
        });
        // @ts-expect-error enforceTypes TODO it does exist
        await actor.update(actorUpdateData, { enforceTypes: false });
      }

      if (itemUpdateData.length > 0) {
        const actorEmbeddedItemsSource = getEmbeddedItemsSource(actorSource, actor.items.contents);
        const itemChangeSummary = describeEmbeddedDocumentChanges(
          actorEmbeddedItemsSource,
          itemUpdateData,
        );
        const itemMigrationName = summarizeMigrationNames(itemMigrationNames);
        logger.info(
          `Migrating embedded Items for unlinked Token actor ${actor.name} in Scene ${scene.name}`,
          {
            documents: [
              { kind: "Actor", uuid: actor.uuid, label: actor.name },
              { kind: "Scene", uuid: scene.uuid, label: scene.name },
            ],
            ...(itemMigrationName ? { migrationName: itemMigrationName } : {}),
            changes: itemChangeSummary.changeRows,
            hiddenChangeCount: itemChangeSummary.hiddenChangeCount,
          },
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

type MigrationChangeSummary = {
  changeRows: MigrationChangeRow[];
  hiddenChangeCount: number;
};

const MAX_LOGGED_CHANGE_ROWS = 200;
const MAX_DIFF_LINES_PER_ROW = 400;

function getDocumentSourceObject(documentData: unknown): object {
  if (!documentData || typeof documentData !== "object") {
    return {};
  }

  const maybeToObject = documentData as { toObject?: (...args: unknown[]) => unknown };
  if (typeof maybeToObject.toObject === "function") {
    try {
      const source = maybeToObject.toObject();
      if (source && typeof source === "object") {
        return source as object;
      }
    } catch {
      // Fall through to best-effort fallback below.
    }
  }

  return documentData as object;
}

function getEmbeddedItemsSource(
  actorSourceData: object,
  fallbackItems: Array<{ id?: string | null; _id?: string | null; name?: string | null }>,
): Array<{ id?: string | null; _id?: string | null; name?: string | null }> {
  const sourceItems = foundry.utils.getProperty(actorSourceData, "items");
  return Array.isArray(sourceItems) ? sourceItems : fallbackItems;
}

function describeDocumentChanges(documentData: object, updateData: object): MigrationChangeSummary {
  try {
    return limitMigrationChangeRows(buildMigrationChangeRows(documentData, updateData));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    applyMigrationsLogger.warn(
      `Failed to build document migration change summary (fallback to empty): ${errorMessage}`,
      { notify: false },
    );
    return { changeRows: [], hiddenChangeCount: 0 };
  }
}

function describeEmbeddedDocumentChanges(
  documents: Array<{ id?: string | null; _id?: string | null; name?: string | null }>,
  updateDataList: object[],
): MigrationChangeSummary {
  try {
    const documentsById = new Map(
      documents.map((document) => [document.id ?? document._id ?? "", document]),
    );
    const changeRows = updateDataList.flatMap((updateData) => {
      const updateRecord = updateData as Record<string, unknown>;
      const documentId = String(updateRecord["_id"] ?? "");
      const sourceDocument = documentsById.get(documentId);
      const labelPrefix = sourceDocument?.name ? `${sourceDocument.name} :: ` : "";
      return buildMigrationChangeRows(sourceDocument ?? {}, updateData, labelPrefix);
    });

    return limitMigrationChangeRows(changeRows);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    applyMigrationsLogger.warn(
      `Failed to build embedded document migration change summary (fallback to empty): ${errorMessage}`,
      { notify: false },
    );
    return { changeRows: [], hiddenChangeCount: 0 };
  }
}

function buildMigrationChangeRows(
  documentData: object,
  updateData: object,
  labelPrefix = "",
): MigrationChangeRow[] {
  const flattened = foundry.utils.flattenObject(updateData) as Record<string, unknown>;

  return Object.entries(flattened)
    .filter(([path]) => path !== "_id")
    .flatMap(([path, newValue]) => {
      const previousValue = getPreviousValueForPath(documentData, path);
      if (isIdentifiedUpdateArray(newValue)) {
        return buildMigrationChangeRowsForIdentifiedArray(
          path,
          previousValue,
          newValue,
          labelPrefix,
        );
      }

      const displayValues = buildMigrationChangeDisplayValues(previousValue, newValue);
      return [
        {
          key: `${labelPrefix}${normalizeUpdatePath(path)}`,
          previousValue: displayValues.previousValue,
          newValue: displayValues.newValue,
          diffLines: buildFoundryUpdateDiffLines(path, previousValue, newValue),
        },
      ];
    })
    .filter((row) => row.key.length > 0 && row.previousValue !== row.newValue)
    .sort((left, right) => left.key.localeCompare(right.key));
}

function buildMigrationChangeRowsForIdentifiedArray(
  path: string,
  previousValue: unknown,
  newValue: unknown[],
  labelPrefix: string,
): MigrationChangeRow[] {
  const basePath = normalizeUpdatePath(path);
  const previousArray = asDocumentArray(previousValue);
  const previousById = new Map(
    previousArray
      .map((entry) => {
        if (!isPlainObject(entry)) {
          return ["", undefined] as const;
        }

        const entryRecord = entry as Record<string, unknown>;
        const entryId = String(entryRecord["_id"] ?? entryRecord["id"] ?? "");
        return [entryId, entry] as const;
      })
      .filter(([entryId]) => entryId.length > 0),
  );

  return newValue.flatMap((entry) => {
    if (!isPlainObject(entry)) {
      return [];
    }

    const entryRecord = entry as Record<string, unknown>;
    const entryId = String(entryRecord["_id"] ?? entryRecord["id"] ?? "");
    const previousEntry = entryId ? (previousById.get(entryId) ?? {}) : {};

    return buildMigrationChangeRows(
      previousEntry as object,
      entryRecord,
      `${labelPrefix}${basePath}[] :: `,
    );
  });
}

function asDocumentArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const valuesFunction = (value as { values?: () => Iterable<unknown> }).values;
  if (typeof valuesFunction === "function") {
    return Array.from(valuesFunction.call(value));
  }

  return [];
}

function getPreviousValueForPath(documentData: object, path: string): unknown {
  const directValue = foundry.utils.getProperty(documentData, path);
  if (directValue !== undefined) {
    return directValue;
  }

  // ActiveEffect source data may expose fields either at top level or under
  // system (e.g., changes <-> system.changes). Try both shapes when direct
  // lookup fails so report diffs keep previous values.
  if (isActiveEffectLikeData(documentData)) {
    if (path.startsWith("system.")) {
      const aliasPath = path.slice("system.".length);
      const aliasValue = foundry.utils.getProperty(documentData, aliasPath);
      if (aliasValue !== undefined) {
        return aliasValue;
      }
    } else {
      const aliasPath = `system.${path}`;
      const aliasValue = foundry.utils.getProperty(documentData, aliasPath);
      if (aliasValue !== undefined) {
        return aliasValue;
      }
    }
  }

  return undefined;
}

function isActiveEffectLikeData(documentData: object): boolean {
  const hasTopLevelChanges = Array.isArray(
    foundry.utils.getProperty(documentData, "changes") as unknown,
  );
  const hasSystemChanges = Array.isArray(
    foundry.utils.getProperty(documentData, "system.changes") as unknown,
  );

  return hasTopLevelChanges || hasSystemChanges;
}

function isIdentifiedUpdateArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every((entry) => {
    if (!isPlainObject(entry)) {
      return false;
    }

    const entryRecord = entry as Record<string, unknown>;
    return entryRecord["_id"] !== undefined || entryRecord["id"] !== undefined;
  });
}

function buildMigrationChangeDisplayValues(
  previousValue: unknown,
  newValue: unknown,
): Pick<MigrationChangeRow, "previousValue" | "newValue"> {
  return {
    previousValue: formatMigrationChangeValue(previousValue),
    newValue: formatMigrationChangeValue(newValue),
  };
}

function buildFoundryUpdateDiffLines(
  path: string,
  previousValue: unknown,
  newValue: unknown,
): MigrationDiffLine[] {
  const leafOperations = buildFoundryLeafOperationLines(path, previousValue, newValue);
  if (leafOperations.length > 0) {
    return leafOperations;
  }

  if (newValue === _del) {
    return [
      {
        kind: "removed",
        value: `- ${toFoundryDeleteOperationPath(path)}: null`,
      },
    ];
  }

  const operationPrefix = previousValue === undefined ? "+" : "~";
  const operationKind: MigrationDiffLine["kind"] =
    previousValue === undefined ? "added" : "changed";
  return [
    {
      kind: operationKind,
      value: `${operationPrefix} ${path}: ${formatMigrationChangeValue(newValue)}`,
    },
  ];
}

function buildFoundryLeafOperationLines(
  basePath: string,
  previousValue: unknown,
  newValue: unknown,
): MigrationDiffLine[] {
  if (!isPlainObject(newValue) && !Array.isArray(newValue)) {
    return [];
  }

  const flattenedNewValue = foundry.utils.flattenObject(newValue as object) as Record<
    string,
    unknown
  >;
  const rawOperationLines: MigrationDiffLine[] = [];

  for (const [relativePath, nextValue] of Object.entries(flattenedNewValue).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const operationPath = relativePath ? `${basePath}.${relativePath}` : basePath;
    const previousLeafValue = relativePath
      ? foundry.utils.getProperty(previousValue as object, relativePath)
      : previousValue;
    const operationLine = buildFoundryOperationLine(operationPath, previousLeafValue, nextValue);
    if (operationLine) {
      rawOperationLines.push(operationLine);
    }
  }

  if (rawOperationLines.length <= MAX_DIFF_LINES_PER_ROW) {
    return rawOperationLines;
  }

  return [
    ...rawOperationLines.slice(0, MAX_DIFF_LINES_PER_ROW),
    {
      kind: "changed",
      value: `~ [capped at ${MAX_DIFF_LINES_PER_ROW} lines] +${rawOperationLines.length - MAX_DIFF_LINES_PER_ROW} operations omitted`,
    },
  ];
}

function buildFoundryOperationLine(
  operationPath: string,
  previousValue: unknown,
  newValue: unknown,
): MigrationDiffLine | undefined {
  if (newValue === _del) {
    if (previousValue === undefined) {
      return undefined;
    }

    return {
      kind: "removed",
      value: `- ${toFoundryDeleteOperationPath(operationPath)}: null`,
    };
  }

  if (areEquivalentUpdateValues(previousValue, newValue)) {
    return undefined;
  }

  const operationPrefix = previousValue === undefined ? "+" : "~";
  const operationKind: MigrationDiffLine["kind"] =
    previousValue === undefined ? "added" : "changed";

  return {
    kind: operationKind,
    value: `${operationPrefix} ${normalizeUpdatePath(operationPath)}: ${formatMigrationChangeValue(newValue)}`,
  };
}

function toFoundryDeleteOperationPath(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot < 0) {
    return `-=${path}`;
  }

  const parentPath = path.slice(0, lastDot);
  const leafKey = path.slice(lastDot + 1);
  return `${parentPath}.-=${leafKey}`;
}

function limitMigrationChangeRows(changeRows: MigrationChangeRow[]): MigrationChangeSummary {
  return {
    changeRows: changeRows.slice(0, MAX_LOGGED_CHANGE_ROWS),
    hiddenChangeCount: Math.max(0, changeRows.length - MAX_LOGGED_CHANGE_ROWS),
  };
}

function normalizeUpdatePath(path: string): string {
  return path
    .replace(/\._id$/g, "")
    .replace(/^_id$/g, "")
    .replace(/\.\d+(?=\.|$)/g, "[]")
    .replace(/\[\](?=\[\])/g, "")
    .replace(/\.+/g, ".")
    .replace(/\.$/, "");
}

function formatMigrationChangeValue(value: unknown): string {
  if (value === _del) {
    return "(deleted)";
  }
  if (value === undefined) {
    return "(undefined)";
  }
  if (value === null) {
    return "null";
  }

  let renderedValue: string | undefined;
  if (typeof value === "string") {
    renderedValue = value;
  } else if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    renderedValue = String(value);
  } else {
    try {
      renderedValue = JSON.stringify(value, null, 2) ?? undefined;
    } catch {
      const valueType = foundry.utils.getType(value);
      renderedValue = `(unserializable ${valueType})`;
    }
  }

  if (!renderedValue) {
    return "(empty)";
  }

  const maxLength = 3000;
  return renderedValue.length > maxLength
    ? `${renderedValue.slice(0, maxLength - 3)}...`
    : renderedValue;
}

function pruneNoopUpdateData<T extends object>(value: T, sourceData?: object): T {
  const pruned = pruneNoopUpdateValue(value);
  if (!pruned || !isPlainObject(pruned)) {
    return {} as T;
  }

  if (!sourceData) {
    return pruned as T;
  }

  const flattened = foundry.utils.flattenObject(pruned) as Record<string, unknown>;
  const filteredEntries = Object.entries(flattened).filter(([path, newValue]) => {
    if (path === "_id") {
      return false;
    }

    const previousValue = foundry.utils.getProperty(sourceData, path);
    if (newValue === _del && previousValue === undefined) {
      return false;
    }

    return !areEquivalentUpdateValues(previousValue, newValue);
  });

  if (filteredEntries.length === 0) {
    return {} as T;
  }

  return foundry.utils.expandObject(Object.fromEntries(filteredEntries)) as T;
}

function pruneNoopUpdateValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => pruneNoopUpdateValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const prunedNested = pruneNoopUpdateValue(nested);
    if (prunedNested === undefined) {
      continue;
    }
    result[key] = prunedNested;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function areEquivalentUpdateValues(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => areEquivalentUpdateValues(value, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every(
      (key) => rightKeys.includes(key) && areEquivalentUpdateValues(left[key], right[key]),
    );
  }

  return false;
}

function getMigrationFunctionName(fn: unknown): string {
  if (typeof fn !== "function") {
    return "anonymousMigration";
  }

  const maybeName = (fn as { name?: string }).name;
  return maybeName || "anonymousMigration";
}

function summarizeMigrationNames(migrationNames: string[]): string | undefined {
  const uniqueMigrationNames = Array.from(new Set(migrationNames.filter((name) => !!name)));
  if (!uniqueMigrationNames.length) {
    return undefined;
  }

  return uniqueMigrationNames.join(", ");
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
