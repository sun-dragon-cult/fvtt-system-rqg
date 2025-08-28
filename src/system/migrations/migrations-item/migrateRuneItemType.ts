import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { ItemUpdate } from "../applyMigrations";
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
