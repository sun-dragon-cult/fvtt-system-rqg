import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { ArmorItem } from "@item-model/armorDataModel.ts";
import { isDocumentSubType } from "../../util.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { MigrationLogger } from "../../logging/migrationLogger";

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
