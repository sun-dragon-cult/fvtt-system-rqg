import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { deleteKeyPrefix } from "../../util";

// Change data.experience to data.hasExperience
export async function changeRuneExperienceFieldName(itemData: ItemData): Promise<ItemUpdate> {
  const updateData: ItemUpdate = {};
  if (itemData.type === ItemTypeEnum.Rune) {
    // Always remove "experience" from runes
    updateData.system = { [`${deleteKeyPrefix}experience`]: null };
    if (itemData.system.hasExperience == null) {
      // @ts-ignore experience
      updateData.system.hasExperience = itemData.experience ?? false;
    }
  }
  return updateData;
}
