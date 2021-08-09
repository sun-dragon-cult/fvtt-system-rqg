import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../rqgActor";
import { getAllRunesIndex, RqgError } from "../../system/util";
import { RqgItem } from "../../items/rqgItem";

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
      const msg = "Expected Cult item";
      ui.notifications?.error(msg);
      throw new RqgError(msg, cultItem, actor);
    }
    const cultRuneNames = [...new Set(cultItem.data.data.runes)]; // No duplicates
    const actorRuneNames = actor.items
      .filter((i) => i.type === ItemTypeEnum.Rune)
      .map((r) => r.name);
    const newRuneNames = cultRuneNames.filter((r: string) => !actorRuneNames.includes(r));
    if (newRuneNames.length > 0) {
      const runesCompendiumName = game.settings.get("rqg", "runesCompendium") as string;
      const runePack = game.packs?.get(runesCompendiumName);
      if (!runePack) {
        const msg = `Couldn't find runes Compendium ${runesCompendiumName}`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, runesCompendiumName);
      }
      const allRunesIndex = getAllRunesIndex(); // Index is previously stored in settings
      const newRuneIds = newRuneNames.map((newRune) => {
        // @ts-ignore 0.8
        const newRuneIndex = allRunesIndex.getName(newRune);
        if (newRuneIndex == null) {
          const msg = `Couldn't find cult rune ${newRune} among allRunesIndex`;
          ui.notifications?.error(msg);
          throw new RqgError(msg, actor, cultItem);
        }
        return newRuneIndex._id;
      });
      // @ts-ignore 0.8
      Promise.all(newRuneIds.map((id: string) => runePack.getDocument(id))).then(
        (newRuneEntities) => {
          newRuneEntities.map(async (rune) => {
            if (rune == null || rune.data.type !== ItemTypeEnum.Rune) {
              const msg = "Couldn't find rune in all runes compendium";
              ui.notifications?.error(msg);
              throw new RqgError(msg, newRuneIds, runePack);
            }
            // @ts-ignore 0.8
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
  static onDeleteItem(actor: RqgActor, cultItem: RqgItem, options: any, userId: string): any {
    const cultRuneMagicItems = actor.items.filter(
      (i) => i.data.type === ItemTypeEnum.RuneMagic && i.data.data.cultId === cultItem._id
    );
    return cultRuneMagicItems.map((i) => {
      return { _id: i._id, "data.cultId": "" };
    });
  }
}
