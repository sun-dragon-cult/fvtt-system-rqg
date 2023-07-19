import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Change data.experience to data.hasExperience
export async function changeRuneExperienceFieldName(itemData: ItemData): Promise<ItemUpdate> {
  const updateData: ItemUpdate = {};
  if (itemData.type === ItemTypeEnum.Rune) {
    // Always remove "experience" from runes
    updateData.system = { [`-=experience`]: null };
    if (itemData.system.hasExperience == null) {
      // @ts-expect-error experience
      updateData.system.hasExperience = itemData.experience ?? false;
    }
  }
  return updateData;
}
