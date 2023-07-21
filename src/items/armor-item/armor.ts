import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";

export class Armor extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static preUpdateItem(actor: RqgActor, armor: RqgItem, updates: object[], options: any): void {
    if (armor.type === ItemTypeEnum.Armor) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, armor, updates));
    }
  }
}
