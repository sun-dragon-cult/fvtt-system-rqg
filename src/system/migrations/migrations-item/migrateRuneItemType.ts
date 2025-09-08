import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { isDocumentSubType, localize } from "../../util";
import type { RuneItem } from "@item-model/runeData.ts";

export async function migrateRuneItemType(itemData: RuneItem): Promise<Item.UpdateData> {
  let updateData = {};
  if (
    isDocumentSubType<RuneItem>(itemData, ItemTypeEnum.Rune) &&
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
