import { BaseItem } from "../baseItem";
import { GearData } from "../../data-model/item-data/gearData";
import { RqgItem } from "../rqgItem";

export class Gear extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", GearSheet, {
  //     types: [ItemTypeEnum.Gear],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<GearData>): RqgItem {
    return item;
  }

  static activateActorSheetListeners(html, sheet) {}
}
