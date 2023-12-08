import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import {
  assertItemType,
  AvailableItemCache,
  cacheAvailableItems,
  getAvailableItems,
  isTruthy,
  RqidTypeStart,
} from "../../util";
import { RqidLink } from "../../../data-model/shared/rqidLink";

export async function migrateArmorCoverage(itemData: ItemData): Promise<ItemUpdate> {
  const updateData = {};

  let availableHitLocations = getAvailableItems(RqidTypeStart.HitLocation, true);
  if (!availableHitLocations.length) {
    await cacheAvailableItems(RqidTypeStart.HitLocation);
    availableHitLocations = getAvailableItems(RqidTypeStart.HitLocation);
  }

  // Migrate Armor item
  if (itemData.type === ItemTypeEnum.Armor) {
    assertItemType(itemData.type, ItemTypeEnum.Armor);

    mergeObject(
      updateData,
      getNameArrayToRqidLinksUpdateData(
        itemData,
        "hitLocations",
        "hitLocationRqidLinks",
        availableHitLocations,
      ),
    );
  }
  return updateData;
}

/**
 * Return update data for the itemData
 */
function getNameArrayToRqidLinksUpdateData(
  itemData: any,
  oldPropName: string,
  newPropName: string,
  availableItems: AvailableItemCache[],
): object {
  const oldNameArray = itemData.system[oldPropName];
  if (!oldNameArray?.length) {
    return {};
  }

  const rqidLinks: RqidLink[] = oldNameArray
    .map((itemName: string) => {
      const rqidLink = getRqidLinkFromName(itemName, availableItems);
      if (!rqidLink) {
        console.warn(
          `No name match for name link to ${itemName} in ${itemData.name} with rqid ${itemData?.flags?.rqg?.documentRqidFlags?.id} when migrating ${oldPropName} in ${itemData.type}.`,
          itemData,
        );
      }
      return rqidLink;
    })
    .filter(isTruthy);
  return { system: { [newPropName]: rqidLinks, [`-=${oldPropName}`]: null } };
}

function getRqidLinkFromName(itemName: string, availableItems: AvailableItemCache[]) {
  const itemCache = availableItems.find((r) => r.name === itemName);
  if (!itemCache) {
    ui.notifications?.warn(
      `Didn't find item name [${itemName}] among cached items when migrating armor`,
    );
    return undefined;
  }
  return new RqidLink(itemCache.rqid, itemCache.name);
}
