import type { RqgActor } from "@actors/rqgActor.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";
import type { GearItem } from "@item-model/gearDataModel.ts";

export const gearLifecycle = {
  handleItemUpdateDocumentsPreUpdate(actor: RqgActor, gear: RqgItem, updates: object[]): void {
    if (isDocumentSubType<GearItem>(gear, ItemTypeEnum.Gear)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, gear, updates));
    }
  },
};
