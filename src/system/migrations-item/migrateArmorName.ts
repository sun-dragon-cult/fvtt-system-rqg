import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ItemUpdate } from "../migrate";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

// Migrate armor item name in v0.19.0 +
export function migrateArmorName(itemData: ItemData): ItemUpdate {
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
