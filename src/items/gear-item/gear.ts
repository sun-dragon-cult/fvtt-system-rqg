import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";

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
    if (gear.type === ItemTypeEnum.Gear) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, gear, updates));
    }
  }
}
