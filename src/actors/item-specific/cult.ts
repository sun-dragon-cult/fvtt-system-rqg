import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../rqgActor";
import { getAllRunesIndex, getGame, localize, RqgError } from "../../system/util";
import { RqgItem } from "../../items/rqgItem";
import { systemId } from "../../system/config";

export class Cult extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", CultSheet, {
  //     types: [ItemTypeEnum.Cult],
  //     makeDefault: true,
  //   });
  // }

  /*
   * Add the cult runes to the Actor
   */
  static async onEmbedItem(
    actor: RqgActor,
    cultItem: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    if (cultItem.data.type !== ItemTypeEnum.Cult) {
      const msg = localize("RQG.Item.Notification.ExpectedCultItemError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, cultItem, actor);
    }
    const cultRuneNames = [...new Set(cultItem.data.data.runes)]; // No duplicates
    const actorRuneNames = actor.items
      .filter((i: RqgItem) => i.type === ItemTypeEnum.Rune)
      .map((r: RqgItem) => r.name);
    const newRuneNames = cultRuneNames.filter((r: string) => !actorRuneNames.includes(r));
    if (newRuneNames.length > 0) {
      const runesCompendiumName = getGame().settings.get(systemId, "runesCompendium");
      const runePack = getGame().packs?.get(runesCompendiumName);
      if (!runePack) {
        const msg = localize("RQG.Item.Notification.CantFindRunesCompendiumError", {
          runesCompendiumName: runesCompendiumName,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, runesCompendiumName);
      }
      const allRunesIndex = getAllRunesIndex();
      const newRuneIds = newRuneNames.map((newRune) => {
        const newRuneIndex = allRunesIndex.getName(newRune);
        if (newRuneIndex == null) {
          const msg = localize("RQG.Item.Notification.CantFindCultRuneError", { newRune: newRune });
          ui.notifications?.error(msg);
          throw new RqgError(msg, actor, cultItem);
        }
        // @ts-ignore TODO Pick "type" only?
        return newRuneIndex._id;
      });
      Promise.all(newRuneIds.map((id: string) => runePack.getDocument(id))).then(
        (newRuneEntities) => {
          newRuneEntities.map(async (rune: StoredDocument<any>) => {
            if (rune == null || rune.data.type !== ItemTypeEnum.Rune) {
              const msg = localize("RQG.Item.Notification.CantFindRuneInAllRunesCompendiumError");
              ui.notifications?.error(msg);
              throw new RqgError(msg, newRuneIds, runePack);
            }
            await actor.createEmbeddedDocuments("Item", [rune.data]);
          });
        }
      );
    }
    return;
  }

  /*
   * Unlink the runeMagic spells that was connected with this cult
   */
  static onDeleteItem(actor: RqgActor, cultItem: RqgItem, options: any, userId: string): any[] {
    const cultRuneMagicItems = actor.items.filter(
      (i) => i.data.type === ItemTypeEnum.RuneMagic && i.data.data.cultId === cultItem._id
    );
    return cultRuneMagicItems.map((i) => {
      return { _id: i._id, "data.cultId": "" };
    });
  }
}
