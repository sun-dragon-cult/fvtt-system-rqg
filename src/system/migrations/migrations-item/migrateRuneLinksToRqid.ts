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
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";

export async function migrateRuneLinksToRqid(
  itemData: ItemData,
  owningActorData?: ActorData,
): Promise<ItemUpdate> {
  const updateData = {};

  let availableRunes = getAvailableItems(RqidTypeStart.Rune, true);
  if (!availableRunes.length) {
    await cacheAvailableItems(RqidTypeStart.Rune);
    availableRunes = getAvailableItems(RqidTypeStart.Rune);
  }

  // Migrate Rune item
  if (itemData.type === ItemTypeEnum.Rune) {
    assertItemType(itemData.type, ItemTypeEnum.Rune);

    // @ts-expect-error opposingRune
    const oldOpposingRuneName = itemData.system.opposingRune;
    if (oldOpposingRuneName) {
      const rqidLink = getRqidLinkFromName(oldOpposingRuneName, availableRunes);
      if (rqidLink) {
        mergeObject(updateData, {
          system: { opposingRuneRqidLink: rqidLink },
        });
      } else {
        console.warn(
          `No name match for name link to ${oldOpposingRuneName} in ${itemData.name} with rqid ${itemData?.flags?.rqg?.documentRqidFlags?.id} when migrating opposingRune in rune item owned by ${owningActorData?.name}.`,
          itemData,
        );
      }
    }

    mergeObject(
      updateData,
      getNameArrayToRqidLinksUpdateData(
        itemData,
        "minorRunes",
        "minorRuneRqidLinks",
        availableRunes,
      ),
    );
  }

  if (itemData.type === ItemTypeEnum.Cult) {
    mergeObject(
      updateData,
      getNameArrayToRqidLinksUpdateData(itemData, "runes", "runeRqidLinks", availableRunes),
    );
  }
  if (itemData.type === ItemTypeEnum.RuneMagic) {
    mergeObject(
      updateData,
      getNameArrayToRqidLinksUpdateData(itemData, "runes", "runeRqidLinks", availableRunes),
    );
  }

  if (itemData.type === ItemTypeEnum.Skill) {
    mergeObject(
      updateData,
      getNameArrayToRqidLinksUpdateData(itemData, "runes", "runeRqidLinks", availableRunes),
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
  availableRunes: AvailableItemCache[],
): object {
  const oldRuneNameArray = itemData.system[oldPropName];
  if (!oldRuneNameArray?.length) {
    return {};
  }

  const runeRqidLinks: RqidLink[] = oldRuneNameArray
    .map((runeName: string) => {
      const rqidLink = getRqidLinkFromName(runeName, availableRunes);
      if (!rqidLink) {
        console.warn(
          `No name match for name link to ${runeName} in ${itemData.name} with rqid ${itemData?.flags?.rqg?.documentRqidFlags?.id} when migrating ${oldPropName} in ${itemData.type}.`,
          itemData,
        );
      }
      return rqidLink;
    })
    .filter(isTruthy);
  return { system: { [newPropName]: runeRqidLinks, [`-=${oldPropName}`]: null } };
}

function getRqidLinkFromName(runeName: string, availableRunes: AvailableItemCache[]) {
  const runeCache = availableRunes.find((r) => r.name === runeName);
  if (!runeCache) {
    ui.notifications?.warn(
      `Didn't find rune name [${runeName}] among cached runes when migrating runes`,
    );
    return undefined;
  }
  return new RqidLink(runeCache.rqid, runeCache.name);
}
