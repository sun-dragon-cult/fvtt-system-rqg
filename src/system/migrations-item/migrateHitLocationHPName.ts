import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ItemUpdate } from "../migrate";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { deleteKeyPrefix } from "../util";

// Rename hit location data hp => hitPoints
export function migrateHitLocationHPName(itemData: ItemData): ItemUpdate {
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
