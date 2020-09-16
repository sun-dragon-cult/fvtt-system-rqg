import { BaseItem } from "../baseItem";
import { ArmorData } from "../../data-model/item-data/armorData";
import { RqgItem } from "../rqgItem";

export class Armor extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<ArmorData>): RqgItem {
    return item;
  }

  static activateActorSheetListeners(html, sheet) {}
}
