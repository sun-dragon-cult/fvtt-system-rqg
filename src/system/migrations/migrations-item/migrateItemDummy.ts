import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Dummy placeholder item Migrator
export async function migrateItemDummy(itemData: ItemData): Promise<ItemUpdate> {
  if (itemData.type === ItemTypeEnum.Armor && false) {
    return {
      name: "newName",
      data: {
        namePrefix: "newNamePrefix",
      },
    };
  }
  return {};
}
