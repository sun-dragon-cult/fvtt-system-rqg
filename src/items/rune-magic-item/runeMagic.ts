import { BaseItem } from "../baseItem";
import { RuneMagicData } from "../../data-model/item-data/runeMagicData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../../actors/rqgActor";

export class RuneMagic extends BaseItem {
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
    runeMagicItemData: Item.Data<RuneMagicData>,
    options: any,
    userId: string
  ): Promise<any> {
    let updateData = {};
    const actorCults = actor.items.filter((i) => i.type === ItemTypeEnum.Cult);
    if (actorCults.length === 1) {
      updateData = { _id: runeMagicItemData._id, data: { cultId: actorCults[0]._id } };
    }
    return updateData;
  }
}
