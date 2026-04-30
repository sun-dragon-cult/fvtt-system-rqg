import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";
import type { GearItem } from "@item-model/gearDataModel.ts";

export class Gear {
  static preUpdateItem(actor: RqgActor, gear: RqgItem, updates: object[]): void {
    if (isDocumentSubType<GearItem>(gear, ItemTypeEnum.Gear)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, gear, updates));
    }
  }
}
