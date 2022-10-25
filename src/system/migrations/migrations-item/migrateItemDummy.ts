import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Dummy placeholder item Migrator.
// Note that all updates will be done in one update, so if one migration changes an item name,
// another migration cannot count on that the new name exists, there could be both new an old names in the world.
export async function migrateItemDummy(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  if (false && itemData.type === ItemTypeEnum.Armor) {
    updateData = {
      name: "newName",
      system: {
        namePrefix: "newNamePrefix",
      },
    };
  }
  return updateData;
}
