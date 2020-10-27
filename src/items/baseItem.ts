import { RqgItem } from "./rqgItem";

export class BaseItem {
  // // TODO will be called multiple times?
  // public static init() {
  //   Items.registerSheet("rqg", PassionSheet, {
  //     types: [ItemTypeEnum.Passion],
  //     makeDefault: true,
  //   });
  //   Items.registerSheet("rqg", ElementalRuneSheet, {
  //     types: [ItemTypeEnum.ElementalRune],
  //     makeDefault: true,
  //   });
  //   Items.registerSheet("rqg", PowerRuneSheet, {
  //     types: [ItemTypeEnum.PowerRune],
  //     makeDefault: true,
  //   });
  // }
  /**
   * Allows each embedded item to prepare its data.
   */
  static prepareAsEmbeddedItem(item: RqgItem): RqgItem {
    console.debug("*** BaseItem prepareAsEmbeddedItem item", item);
    return item;
  }

  // TODO return type should be "active effect data"
  public static generateActiveEffect(itemData: ItemData): any {
    return;
  }
}
