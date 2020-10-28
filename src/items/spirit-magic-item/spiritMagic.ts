import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";
import { SpiritMagicData } from "../../data-model/item-data/spiritMagicData";

export class SpiritMagic extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", SpiritMagicSheet, {
  //     types: [ItemTypeEnum.SpiritMagic],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<SpiritMagicData>): RqgItem {
    console.debug("*** SpiritMagic prepareAsEmbeddedItem", item);

    return item;
  }
}
