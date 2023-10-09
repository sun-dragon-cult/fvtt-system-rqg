import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import {
  assertItemType,
  AvailableRuneCache,
  cacheAvailableRunes,
  getAvailableRunes,
  isTruthy,
} from "../../util";
import { RqidLink } from "../../../data-model/shared/rqidLink";

export async function migrateRuneLinksToRqid(itemData: ItemData): Promise<ItemUpdate> {
  const updateData = {};

  let availableRunes = getAvailableRunes(true);
  if (!availableRunes.length) {
    await cacheAvailableRunes();
    availableRunes = getAvailableRunes();
  }

  // Migrate Rune item
  if (itemData.type === ItemTypeEnum.Rune) {
    assertItemType(itemData.type, ItemTypeEnum.Rune);

    // @ts-expect-error opposingRune
    const oldOpposingRuneName = itemData.system.opposingRune;
    const rqidLink = getRqidLinkFromName(oldOpposingRuneName, availableRunes);
    if (rqidLink) {
      mergeObject(updateData, {
        system: { opposingRuneRqidLink: rqidLink },
      });
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
    // TODO ...
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
  availableRunes: AvailableRuneCache[],
): object {
  const oldRuneNameArray = itemData.system[oldPropName];
  if (!oldRuneNameArray?.length) {
    return {};
  }

  const runeRqidLinks: RqidLink[] = oldRuneNameArray
    .map((runeName: string) => {
      return getRqidLinkFromName(runeName, availableRunes);
    })
    .filter(isTruthy);
  return { system: { [newPropName]: runeRqidLinks, [`-=${oldPropName}`]: null } };
}

function getRqidLinkFromName(runeName: string, availableRunes: AvailableRuneCache[]) {
  const runeCache = availableRunes.find((r) => r.name === runeName);
  if (!runeCache) {
    ui.notifications?.warn("Didn't find rune name when migrating runes");
    return undefined;
  }
  return new RqidLink(runeCache.rqid, runeCache.name);
}
