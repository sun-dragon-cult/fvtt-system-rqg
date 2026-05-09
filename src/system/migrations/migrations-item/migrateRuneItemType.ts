import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { isDocumentSubType, localize } from "../../util";
import type { RuneItem } from "@item-model/runeDataModel.ts";
import type { RqgItem } from "@items/rqgItem.ts";

import type { RqgActor } from "@actors/rqgActor.ts";
import type { MigrationLogger } from "../../logging/migrationLogger";

export async function migrateRuneItemType(
  itemData: RqgItem,
  _owningActorData?: RqgActor,
  _migrationLogger?: MigrationLogger,
): Promise<Item.UpdateData> {
  void _owningActorData;
  void _migrationLogger;

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
