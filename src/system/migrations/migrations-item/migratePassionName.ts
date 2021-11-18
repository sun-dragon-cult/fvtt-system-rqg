import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Change PassionEnum name to title case
export async function migratePassionName(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  if (itemData.type === ItemTypeEnum.Passion && itemData.name !== itemData.name.titleCase()) {
    const newPassionName = itemData.data.passion.titleCase();
    const subject = itemData.data.subject ? ` (${itemData.data.subject})` : "";
    updateData = {
      name: `${newPassionName}${subject}`,
      data: {
        passion: newPassionName,
      },
    };
  }
  return updateData;
}
