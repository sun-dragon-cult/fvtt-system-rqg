import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { HitLocationsEnum, HitLocationTypesEnum } from "../../data-model/item-data/hitLocationData";
import { ItemUpdate } from "../migrate";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

// Migrate hitLocation type for damage calculations in v0.16.0 +
export function migrateHitLocationType(itemData: ItemData): ItemUpdate {
  let updateData = {};
  if (itemData.type === ItemTypeEnum.HitLocation && !itemData.data.hitLocationType) {
    let hitLocationType: HitLocationTypesEnum;
    if (itemData.name === HitLocationsEnum.Abdomen) {
      hitLocationType = HitLocationTypesEnum.Abdomen;
    } else if (itemData.name === HitLocationsEnum.Head) {
      hitLocationType = HitLocationTypesEnum.Head;
    } else if (itemData.name === HitLocationsEnum.Chest) {
      hitLocationType = HitLocationTypesEnum.Chest;
    } else {
      hitLocationType = HitLocationTypesEnum.Limb;
      if (itemData.name.includes("Leg")) {
        itemData.data.connectedTo = HitLocationsEnum.Abdomen;
      }
    }
    updateData = {
      data: {
        hitLocationType: hitLocationType,
      },
    };
  }
  return updateData;
}
