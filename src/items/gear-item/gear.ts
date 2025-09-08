import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";
import type { GearItem } from "@item-model/gearData.ts";

export class Gear extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", GearSheet, {
  //     types: [ItemTypeEnum.Gear],
  //     makeDefault: true,
  //   });
  // }

  static override preUpdateItem(
    actor: RqgActor,
    gear: RqgItem,
    updates: object[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
  ): void {
    if (isDocumentSubType<GearItem>(gear, ItemTypeEnum.Gear)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, gear, updates));
    }
  }
}
