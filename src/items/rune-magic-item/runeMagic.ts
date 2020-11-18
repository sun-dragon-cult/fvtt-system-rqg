import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";
import { RuneMagicData } from "../../data-model/item-data/runeMagicData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class RuneMagic extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<RuneMagicData>): RqgItem {
    console.debug("*** RuneMagic prepareAsEmbeddedItem", item);
    const actorCultIds = item.actor
      .getEmbeddedCollection("OwnedItem")
      .filter((i) => i.type === ItemTypeEnum.Cult)
      .map((c) => c._id);
    if (!item.data.data.cultId) {
      if (actorCultIds.length === 1) {
        item.data.data.cultId = actorCultIds[0]._id;
      }
    } else if (!actorCultIds.includes(item.data.data.cultId)) {
      // Cult was removed - unlink the cult spells.
      item.data.data.cultId = undefined;
    }
    return item;
  }
}
