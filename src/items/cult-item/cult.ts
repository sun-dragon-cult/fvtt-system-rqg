import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, isTruthy, RqgError } from "../../system/util";
import { deriveCultItemName } from "./cultHelpers";
import { Rqid } from "../../system/api/rqidApi";
import { RqidLink } from "../../data-model/shared/rqidLink";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../rqgItem";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static onDeleteItem(actor: RqgActor, cultItem: RqgItem, options: any, userId: string): any[] {
    const cultRuneMagicItems = actor.items.filter(
      (i) => i.type === ItemTypeEnum.RuneMagic && i.system.cultId === cultItem.id,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {
    assertItemType(child.type, ItemTypeEnum.Cult);

    const matchingDeityInActorCults = actor.items.filter(
      (i) => i.type === ItemTypeEnum.Cult && i.system.deity === child.system.deity,
    );

    switch (matchingDeityInActorCults.length) {
      case 1: {
        // This is a new deity to the actor
        await Cult.embedCommonRuneMagic(child);
        return;
      }

      case 2: {
        // Actor already has this deity - add the joinedCults from the new and old Cult items
        await child.delete();
        const newJoinedCults = [
          ...matchingDeityInActorCults[0].system.joinedCults,
          ...child.system.joinedCults,
        ];
        const newCultItemName = deriveCultItemName(
          matchingDeityInActorCults[0].system.deity,
          newJoinedCults.map((c) => c.cultName),
        );

        return {
          _id: matchingDeityInActorCults[0].id,
          name: newCultItemName,
          system: {
            joinedCults: newJoinedCults,
          },
        };
      }

      default: {
        // 0 (failed embed) or multiple cults with same deity
        const msg = "Actor should not have multiple Cults with same Deity";
        ui.notifications?.error(msg);
        throw new RqgError(msg, [actor, child]);
      }
    }
  }

  public static async embedCommonRuneMagic(cult: RqgItem): Promise<void> {
    const actor = cult.parent;
    if (!actor) {
      const msg = "Bug - tried to embed linked common rune magic on a cult that is not embedded";
      console.error(`RQG | ${msg}`, cult);
      ui?.notifications?.error(`${msg}`);
      throw new RqgError(msg, [cult]);
    }
    if (!cult.id) {
      const msg = "Bug - tried to embed linked common rune magic with a cult that does not have id";
      console.error(`RQG | ${msg}`, cult);
      ui?.notifications?.error(`${msg}`);
      throw new RqgError(msg, [cult]);
    }

    const runeMagicItems = await Promise.all(
      cult.system.commonRuneMagicRqidLinks.map(
        async (rqidLink: RqidLink) => (await Rqid.fromRqid(rqidLink.rqid)) as RqgItem,
      ),
    );

    const connectedRuneMagicItems = runeMagicItems.filter(isTruthy).map((rm: RqgItem) => {
      rm.system.cultId = cult.id!;
      return rm.toObject(false);
    });

    await actor.createEmbeddedDocuments("Item", connectedRuneMagicItems as any);
  }
}
