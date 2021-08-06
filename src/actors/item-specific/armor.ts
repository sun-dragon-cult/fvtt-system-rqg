import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getSameLocationUpdates } from "./shared/physicalItemUtil";

export class Armor extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  static preUpdateItem(actor: RqgActor, armor: RqgItem, updates: object[], options: any): void {
    if (armor.data.type === ItemTypeEnum.Armor) {
      updates.push(...getSameLocationUpdates(actor, armor, updates));
    }
  }
}
