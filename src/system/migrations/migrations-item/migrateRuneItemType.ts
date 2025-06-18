import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { localize } from "../../util";

export async function migrateRuneItemType(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  if (itemData.type === ItemTypeEnum.Rune && typeof itemData.system.runeType === "string") {
    updateData = {
      system: {
        runeType: {
          type: itemData.system.runeType,
          name: localize(`RQG.Item.Rune.RuneType.${itemData.system.runeType}`),
        },
      },
    };
  }
  return updateData;
}
