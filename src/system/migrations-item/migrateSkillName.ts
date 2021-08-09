import { ItemTypeEnum, RqgItemData } from "../../data-model/item-data/itemTypes";

// Migrate skill item name in v0.19.0 +
export function migrateSkillName(itemData: RqgItemData): any {
  let updateData = {};
  const currentGameVersion = game.settings.get("rqg", "systemMigrationVersion") as string;
  if (
    isNewerVersion("v0.19.0", currentGameVersion) &&
    itemData.type === ItemTypeEnum.Skill &&
    !itemData.name.includes(" - ")
  ) {
    updateData = {
      name: `${itemData.data.skillName} ${itemData.data.specialization} - ${itemData.data.category}`,
    };
  }
  return updateData;
}
