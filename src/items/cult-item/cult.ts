import { BaseItem } from "../baseItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultData } from "../../data-model/item-data/cultData";
import { RqgActor } from "../../actors/rqgActor";
import { logBug } from "../../system/util";

export class Cult extends BaseItem {
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
    cultItem: Item.Data<CultData>,
    options: any,
    userId: string
  ): Promise<any> {
    const cultRuneNames = [...new Set(cultItem.data.runes)]; // No duplicates
    const actorRuneNames = actor.items
      .filter((i) => i.type === ItemTypeEnum.Rune)
      .map((r) => r.name);
    const newRuneNames = cultRuneNames.filter((r) => !actorRuneNames.includes(r));
    if (newRuneNames) {
      const runesCompendiumName = game.settings.get("rqg", "runesCompendium") as string;
      const runePack = game.packs?.get(runesCompendiumName);
      if (!runePack) {
        logBug("Couldn't find runes Compendium");
        return;
      }
      const allRunesIndex = game.settings.get("rqg", "runes") as Compendium.IndexEntry[]; // Index is previously stored in settings
      const newRuneIds = newRuneNames.map((newRune) => {
        const newRuneIndex = allRunesIndex.find((r) => r.name === newRune);
        if (newRuneIndex) {
          return newRuneIndex._id;
        } else {
          logBug(`Couldn't find cult rune ${newRune} among allRunesIndex`, actor, cultItem);
          return;
        }
      }) as string[];
      const newRuneEntities = await Promise.all(newRuneIds.map((id) => runePack.getEntity(id)));
      newRuneEntities.map(async (rune) => {
        if (rune) {
          await actor.createOwnedItem(rune.data);
        } else {
          logBug("Couldn't find rune in all runes compendium");
        }
      });
    }
    return;
  }

  /*
   * Unlink the runeMagic spells that was connected with this cult
   */
  static async onDeleteItem(
    actor: RqgActor,
    cultItem: Item.Data<CultData>,
    options: any,
    userId: string
  ): Promise<any> {
    const cultRuneMagicItems = actor.items.filter(
      (i) => i.data.type === ItemTypeEnum.RuneMagic && i.data.data.cultId === cultItem._id
    );
    return cultRuneMagicItems.map((i) => {
      return { _id: i._id, "data.cultId": "" };
    });
  }
}
