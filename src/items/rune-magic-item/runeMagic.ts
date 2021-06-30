import { BaseEmbeddedItem } from "../baseEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";

export class RuneMagic extends BaseEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  /*
   * If the actor only has one cult, then connect this runeMagic to that cult.
   */
  static async onEmbedItem(
    actor: RqgActor,
    runeMagicItemData: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let updateData = {};
    const actorCults = actor.items.filter((i) => i.type === ItemTypeEnum.Cult);
    if (actorCults.length === 1) {
      // @ts-ignore 0.8 _id
      updateData = { _id: runeMagicItemData.id, data: { cultId: actorCults[0].id } };
    }
    return updateData;
  }
}
