import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";

export class Armor extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  static override preUpdateItem(actor: RqgActor, armor: RqgItem, updates: object[]): void {
    if (armor.type === ItemTypeEnum.Armor) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, armor, updates));
    }
  }
}
