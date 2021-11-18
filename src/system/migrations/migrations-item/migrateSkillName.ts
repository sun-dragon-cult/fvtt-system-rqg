import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { getGame } from "../../util";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

// Migrate skill item name in v0.19.0 +
export async function migrateSkillName(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  const currentGameVersion = getGame().settings.get("rqg", "systemMigrationVersion") as string;
  if (
    isNewerVersion("v0.19.0", currentGameVersion) &&
    itemData.type === ItemTypeEnum.Skill &&
    !itemData.name.includes(" - ")
  ) {
    const specialization = itemData.data.specialization ? ` (${itemData.data.specialization})` : "";
    updateData = {
      name: `${itemData.data.skillName}${specialization} - ${itemData.data.category}`,
    };
  }
  return updateData;
}
