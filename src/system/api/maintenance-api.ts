import { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  DEFAULT_RQID_BATCH_ITEM_TYPES,
  RqidBatchEditor,
} from "../../applications/rqid-batch-editor/rqid-batch-editor";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { ERR } from "../error-registry";
import { RqgLogger } from "../logging/rqg-logger";
import type { MigrationScope } from "../migrations/apply-migrations";
import {
  getSystemMigrations,
  logMigrationReport,
  runWorldMigrations,
} from "../migrations/migrate-world";
import { type MigrationReport, toMigrationReport } from "../migrations/migration-report";
import { localize } from "../util";

const logger = new RqgLogger("MaintenanceApi");

const validItemTypes: string[] = Object.values(ItemTypeEnum);

/**
 * Show an application that lets you set rqid for items. Without arguments it covers the item
 * types that need an rqid for the system to work.
 *
 * @public since 6.2.0
 */
export async function openRqidBatchEditor(...itemTypes: string[]): Promise<void> {
  if (!game.user?.isGM) {
    logger.throw(ERR.gmOnlyOperation);
  }
  const unknown = itemTypes.find((itemType) => !validItemTypes.includes(itemType));
  if (unknown !== undefined) {
    logger.throw(
      localize("RQG.Notification.Error.UnknownItemType", {
        itemType: unknown,
        validTypes: validItemTypes.join(", "),
      }),
    );
  }
  const types = (
    itemTypes.length ? (itemTypes as ItemTypeEnum[]) : DEFAULT_RQID_BATCH_ITEM_TYPES
  ) as Item.SubType[];
  await RqidBatchEditor.factory(...types);
}

/** A migration of your own: gets the document, returns the update to apply, or nothing. */
export type CustomMigration<TDocument, TUpdate> = (
  document: TDocument,
) => Promise<TUpdate | undefined>;

/** @public since 6.2.0 */
export interface ApplyWorldMigrationsOptions {
  /** Your own migrations, run on every item the run reaches. */
  items?: CustomMigration<RqgItem, Item.UpdateData>[];
  /** Your own migrations, run on every actor the run reaches. */
  actors?: CustomMigration<RqgActor, Actor.UpdateData>[];
  /** Your own migrations, run on every active effect in the compendiums the run reaches. */
  activeEffects?: CustomMigration<ActiveEffect.Implementation, ActiveEffect.UpdateData>[];
  /** Also run the system's own migrations. Default false. */
  system?: boolean;
  /** Return the report without changing anything. Default false. */
  dryRun?: boolean;
  /**
   * What the run reaches besides the world's actors, items and scenes: `"world"` (default) no
   * compendium, `"all"` every compendium that doesn't belong to the system, or a list of pack ids.
   */
  scope?: MigrationScope;
  /** Write the report to the migration journal. Default true, false for a dry run. */
  report?: boolean;
}

/** Keeps the function name, which the migration report lists. */
function adaptCustomMigration<TDocument, TUpdate extends object>(
  migration: CustomMigration<TDocument, TUpdate>,
): (document: TDocument) => Promise<TUpdate> {
  const adapted = async (document: TDocument): Promise<TUpdate> =>
    (await migration(document)) ?? ({} as TUpdate);
  Object.defineProperty(adapted, "name", { value: migration.name || "customMigration" });
  return adapted;
}

/**
 * Run migrations over the world, and optionally the compendiums. A dry run only reports what
 * would change. Nothing is migrated unless you pass your own migrations or `system: true`.
 *
 * @public since 6.2.0
 */
export async function applyWorldMigrations(
  options: ApplyWorldMigrationsOptions = {},
): Promise<MigrationReport> {
  if (!game.user?.isGM) {
    logger.throw(ERR.gmOnlyOperation);
  }
  const { dryRun = false, scope = "world", system = false } = options;
  const report = options.report ?? !dryRun;
  if (Array.isArray(scope)) {
    const unknownPack = scope.find((packId) => !game.packs?.has(packId));
    if (unknownPack !== undefined) {
      logger.throw(`applyWorldMigrations: there is no compendium "${unknownPack}" in scope`);
    }
  }

  const systemMigrations = system
    ? getSystemMigrations()
    : { items: [], actors: [], activeEffects: [] };
  const items = [...systemMigrations.items, ...(options.items ?? []).map(adaptCustomMigration)];
  const actors = [...systemMigrations.actors, ...(options.actors ?? []).map(adaptCustomMigration)];
  const activeEffects = [
    ...systemMigrations.activeEffects,
    ...(options.activeEffects ?? []).map(adaptCustomMigration),
  ];
  if (!items.length && !actors.length && !activeEffects.length) {
    logger.warn("applyWorldMigrations: no migrations to run, pass system: true or your own", {
      notify: false,
    });
  }

  const result = await runWorldMigrations({ items, actors, activeEffects, dryRun, scope });
  if (report) {
    await logMigrationReport(game.system?.version ?? "", result, dryRun);
  }
  return toMigrationReport(result, dryRun);
}
