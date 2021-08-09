import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { RqgError } from "../../system/util";

export class RuneMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.data.type !== ItemTypeEnum.RuneMagic || !item.actor) {
      const msg = `Wrong itemtype or not embedded item in Actor PrepareEmbeddedEntities`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    const runeMagicCult = actor.items.get(item.data.data.cultId);
    if (!runeMagicCult || runeMagicCult.data.type !== ItemTypeEnum.Cult) {
      const msg = "Rune Magic Cult doesn't exist";
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor, item);
    }
    item.data.data.chance = RuneMagic.calcRuneMagicChance(
      // @ts-ignore 0.8 toObject
      actor.items.toObject(false),
      runeMagicCult.data.data.runes,
      item.data.data.runes
    );

    return item;
  }

  private static calcRuneMagicChance(
    actorItems: RqgItem[],
    cultRuneNames: string[],
    runeMagicRuneNames: string[]
  ): number {
    const runeChances = actorItems
      .filter(
        (i: RqgItem) =>
          i.type === ItemTypeEnum.Rune &&
          (runeMagicRuneNames.includes(i.name) ||
            (runeMagicRuneNames.includes("Magic (condition)") && cultRuneNames.includes(i.name)))
      )
      // @ts-ignore r is a runeItem
      .map((r: RqgItem) => r.data.chance);
    return Math.max(...runeChances);
  }

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
      // @ts-ignore 0.8 _id
      updateData = {
        _id: runeMagicItem.id,
        data: { cultId: actorCults[0].id },
      };
    }
    return updateData;
  }
}
