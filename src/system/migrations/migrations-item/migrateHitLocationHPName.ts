import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { deleteKeyPrefix } from "../../util";
import { ItemUpdate } from "../applyMigrations";

// Rename hit location data hp => hitPoints
export async function migrateHitLocationHPName(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  if (itemData.type === ItemTypeEnum.HitLocation && (itemData.data as any).hp != null) {
    updateData = {
      data: {
        hitPoints: (itemData.data as any).hp,
        [`${deleteKeyPrefix}hp`]: null,
      },
    };
  }
  return updateData;
}
