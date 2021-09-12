import { ItemUpdate } from "../migrate";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

// Migrate price to new model definition in v0.14.0 +
export function migrateItemEstimatedPrice(itemData: ItemData): ItemUpdate {
  if (
    "physicalItemType" in itemData.data &&
    itemData.data.physicalItemType &&
    typeof itemData.data.price !== "object"
  ) {
    const currentPrice = itemData.data.price;
    return {
      data: {
        price: {
          real: currentPrice,
          estimated: 0,
        },
      },
    };
  }
  return {};
}
