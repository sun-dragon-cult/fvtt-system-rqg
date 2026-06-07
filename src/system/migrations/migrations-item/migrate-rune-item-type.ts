import { ItemTypeEnum } from "@item-model/item-types.ts";
import { isDocumentSubType, localize } from "../../util";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import type { RqgItem } from "@items/rqg-item.ts";

export async function migrateRuneItemType(itemData: RqgItem): Promise<Item.UpdateData> {
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
