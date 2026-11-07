import { ItemTypeEnum } from "@item-model/item-types.ts";
import { passionKeys } from "@item-model/passion-enums.ts";
import { RqgLogger } from "../logging/rqg-logger";
import type { MigrationDocumentLink, MigrationLogEntry } from "./apply-migrations";

const logger = new RqgLogger("Migration");

type ItemSource = { _id: string | null; type: string; system: Record<string, unknown> };

/** The update that writes what migrateData converted for one item source, if it has any. */
function getConvertedFieldUpdate(source: ItemSource): object | undefined {
  const { passion, runeType } = source.system;
  if (
    source.type === ItemTypeEnum.Passion &&
    typeof passion === "string" &&
    passionKeys.includes(passion)
  ) {
    return { _id: source._id, "system.passion": passion };
  }
  if (source.type === ItemTypeEnum.Rune && typeof runeType === "string") {
    return { _id: source._id, "system.runeType": runeType };
  }
  return undefined;
}

/** Updates that write the converted fields of these items. */
export function getConvertedFieldUpdates(items: Iterable<{ _source: unknown }>): object[] {
  return Array.from(items, (item) => getConvertedFieldUpdate(item._source as ItemSource)).filter(
    (update): update is object => update !== undefined,
  );
}

/**
 * Write what migrateData converted in memory, so the database stops depending on the old shape:
 * passion labels turned into keys, and the old {type, name} rune type turned into the type. The
 * loaded data already holds the new value, so a normal update finds no change and sends nothing;
 * `diff: false` sends it. Returns the error log entries for the migration report.
 */
export async function persistConvertedItemFields(): Promise<MigrationLogEntry[]> {
  const options = { diff: false, render: false };
  const errors: MigrationLogEntry[] = [];
  const logError = (message: string, documents: MigrationDocumentLink[]) => {
    logger.error(message, { notify: false });
    errors.push({ level: "error", message, documents });
  };

  const worldUpdates = getConvertedFieldUpdates(game.items ?? []);
  if (worldUpdates.length) {
    try {
      await Item.implementation.updateDocuments(worldUpdates as Item.UpdateData[], options);
    } catch (err: unknown) {
      logError(
        `Couldn't save converted passion and rune fields on world items: ${String(err)}`,
        [],
      );
    }
  }

  for (const actor of game.actors ?? []) {
    const updates = getConvertedFieldUpdates(actor.items);
    if (!updates.length) {
      continue;
    }
    try {
      await actor.updateEmbeddedDocuments("Item", updates as Item.UpdateData[], options);
    } catch (err: unknown) {
      logError(`Couldn't save converted passion and rune fields: ${String(err)}`, [
        { kind: "Actor", uuid: actor.uuid, label: actor.name },
      ]);
    }
  }
  return errors;
}
