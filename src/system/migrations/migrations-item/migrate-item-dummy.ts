import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { ArmorItem } from "@item-model/armor-data-model.ts";
import { isDocumentSubType } from "../../util.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { MigrationLogger } from "../../logging/migration-logger";

// Dummy placeholder item Migrator.
// Note that all updates will be done in one update, so if one migration changes an item name,
// another migration cannot count on that the new name exists, there could be both new an old names in the world.
export async function migrateItemDummy(
  itemData: RqgItem,
  _owningActorData?: RqgActor,
  _migrationLogger?: MigrationLogger,
): Promise<Item.UpdateData> {
  void _owningActorData;
  void _migrationLogger;

  let updateData: Item.UpdateData = {};
  // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
  if (false && isDocumentSubType<ArmorItem>(itemData, ItemTypeEnum.Armor)) {
    updateData = {
      name: "newName",
      system: {
        namePrefix: "newNamePrefix",
      },
    };
  }
  return updateData;
}
