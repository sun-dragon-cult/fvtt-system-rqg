import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { ArmorItem } from "@item-model/armorData.ts";
import { isDocumentSubType } from "../../util.ts";

// Dummy placeholder item Migrator.
// Note that all updates will be done in one update, so if one migration changes an item name,
// another migration cannot count on that the new name exists, there could be both new an old names in the world.
export async function migrateItemDummy(itemData: ArmorItem): Promise<Item.UpdateData> {
  let updateData = {};
  // eslint-disable-next-line
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
