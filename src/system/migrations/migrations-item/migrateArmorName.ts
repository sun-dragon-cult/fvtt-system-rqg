import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Migrate armor item name in v0.19.0 +
export async function migrateArmorName(itemData: ItemData): Promise<ItemUpdate> {
  if (
    itemData.type === ItemTypeEnum.Armor &&
    !itemData.data.namePrefix &&
    !itemData.data.armorType &&
    !itemData.name.endsWith(")")
  ) {
    const newNamePrefix = itemData.name; // Preserve the old name
    const newArmorType = "";
    const newName = `${newNamePrefix} ${newArmorType} (${itemData.data.material})`;

    return {
      name: newName,
      data: {
        namePrefix: newNamePrefix,
        armorType: newArmorType,
      },
    };
  }
  return {};
}
