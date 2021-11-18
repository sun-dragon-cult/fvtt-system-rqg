import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemUpdate } from "../applyMigrations";

export async function migrateDoubleLeftArms(itemData: ItemData): Promise<ItemUpdate> {
  if (
    itemData.type === ItemTypeEnum.HitLocation &&
    itemData.data.dieFrom === 13 &&
    itemData.data.dieTo === 15 &&
    itemData.name === "Left Arm"
  ) {
    return {
      name: "Right Arm",
    };
  }

  if (
    itemData.type === ItemTypeEnum.Armor &&
    itemData.data.hitLocations.filter((h) => h === "Left Arm").length === 2
  ) {
    const newArmorCoverageArray = itemData.data.hitLocations
      .filter((h) => h !== "Left Arm")
      .concat("Left Arm", "Right Arm");
    return {
      data: {
        hitLocations: newArmorCoverageArray,
      },
    };
  }

  return {};
}
