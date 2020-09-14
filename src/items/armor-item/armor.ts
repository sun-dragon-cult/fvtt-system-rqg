import { BaseItem } from "../baseItem";
import { ArmorData } from "../../data-model/item-data/armorData";

export class Armor extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  public static async prepareItemForActorSheet(item: Item<ArmorData>) {
    return item;
  }
}
