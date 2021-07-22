import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { calcRuneMagicChance } from "../../items/rune-magic-item/calculations";

export class RuneMagic extends AbstractEmbeddedItem {
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
    runeMagicItem: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let updateData = {};
    const actorCults = actor.items.filter((i) => i.type === ItemTypeEnum.Cult);
    if (actorCults.length === 1 && runeMagicItem.data.type === ItemTypeEnum.RuneMagic) {
      const chance = calcRuneMagicChance(
        actor.items,
        actorCults[0].id,
        runeMagicItem.data.data.runes
      );
      // @ts-ignore 0.8 _id
      updateData = {
        _id: runeMagicItem.id,
        data: { cultId: actorCults[0].id, chance: chance },
      };
    }
    return updateData;
  }
}
