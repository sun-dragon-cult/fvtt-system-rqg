import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Dummy placeholder item Migrator
export async function migrateItemDummy(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  if (false && itemData.type === ItemTypeEnum.Armor) {
    updateData = {
      name: "newName",
      data: {
        namePrefix: "newNamePrefix",
      },
    };
  }
  return updateData;
}
