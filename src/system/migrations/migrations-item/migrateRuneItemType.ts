import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { localize } from "../../util";
import type { RuneItem } from "@item-model/runeData.ts";

export async function migrateRuneItemType(itemData: RuneItem): Promise<Item.UpdateData> {
  let updateData = {};
  if (
    itemData.type === ItemTypeEnum.Rune.toString() &&
    typeof (itemData.system.runeType as any) === "string"
  ) {
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
