import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";
import { RuneMagicData } from "../../data-model/item-data/runeMagicData";

export class RuneMagic extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<RuneMagicData>): RqgItem {
    console.debug("*** RuneMagic prepareAsEmbeddedItem", item);

    return item;
  }
}
