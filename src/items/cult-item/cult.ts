import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../rqgItem";
import { assertItemType, RqgError } from "../../system/util";
import { deriveCultItemName } from "./cultHelpers";

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

  /**
   * If the actor already has a Cult with the same Deity, then merge the data from the joined subcults.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    assertItemType(child.type, ItemTypeEnum.Cult);

    const matchingActorCult = actor.items.filter(
      (i) => i.type === ItemTypeEnum.Cult && i.system.deity === child.system.deity
    );
    if (matchingActorCult.length > 2) {
      throw new RqgError("Actor should not have multiple Cults with same Deity", [actor, child]);
    }
    if (matchingActorCult.length === 2) {
      await actor.deleteEmbeddedDocuments("Item", [child.id!]);
      const newJoinedCults = [
        ...matchingActorCult[0].system.joinedCults,
        ...child.system.joinedCults,
      ];
      const newCultItemName = deriveCultItemName(
        matchingActorCult[0].system.deity,
        newJoinedCults.map((c) => c.cultName)
      );
      return {
        _id: matchingActorCult[0].id,
        name: newCultItemName,
        system: {
          joinedCults: newJoinedCults,
        },
      };
    }
  }
}
