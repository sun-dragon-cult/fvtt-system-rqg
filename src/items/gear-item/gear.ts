import { BaseItem } from "../baseItem";
import { GearData } from "../../data-model/item-data/gearData";

export class Gear extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", GearSheet, {
  //     types: [ItemTypeEnum.Gear],
  //     makeDefault: true,
  //   });
  // }

  public static async prepareItemForActorSheet(item: Item<GearData>) {
    return item;
  }
}
