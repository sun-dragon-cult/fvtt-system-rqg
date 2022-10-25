import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";

export class Cult extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", CultSheet, {
  //     types: [ItemTypeEnum.Cult],
  //     makeDefault: true,
  //   });
  // }

  /*
   * Unlink the runeMagic spells that was connected with this cult
   */
  static onDeleteItem(actor: RqgActor, cultItem: RqgItem, options: any, userId: string): any[] {
    const cultRuneMagicItems = actor.items.filter(
      (i) => i.type === ItemTypeEnum.RuneMagic && i.system.cultId === cultItem.id
    );
    return cultRuneMagicItems.map((i) => {
      return { _id: i.id, "system.cultId": "" };
    });
  }
}
