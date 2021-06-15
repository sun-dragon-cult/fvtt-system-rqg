import { RqgItemData } from "../../data-model/item-data/itemTypes";

// Migrate price to new model definition in v0.14.0 +
export function migrateItemEstimatedPrice(itemData: RqgItemData): any {
  let updateData = {};
  if (
    "physicalItemType" in itemData.data &&
    itemData.data.physicalItemType &&
    typeof itemData.data.price !== "object"
  ) {
    const currentPrice = itemData.data.price;
    updateData = {
      data: {
        price: {
          real: currentPrice,
          estimated: 0,
        },
      },
    };
  }
  return updateData;
}
