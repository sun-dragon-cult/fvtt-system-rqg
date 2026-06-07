import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { getLocationRelatedUpdates } from "../shared/physical-item-util";
import { isDocumentSubType } from "../../system/util.ts";
import type { GearItem } from "@item-model/gear-data-model.ts";

export const gearLifecycle = {
  handleItemUpdateDocumentsPreUpdate(actor: RqgActor, gear: RqgItem, updates: object[]): void {
    if (isDocumentSubType<GearItem>(gear, ItemTypeEnum.Gear)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, gear, updates));
    }
  },
};
