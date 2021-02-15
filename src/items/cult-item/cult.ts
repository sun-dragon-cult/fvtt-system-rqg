import { BaseItem } from "../baseItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultData } from "../../data-model/item-data/cultData";
import { RqgActor } from "../../actors/rqgActor";
import { RuneData } from "../../data-model/item-data/runeData";

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
    cultItem: ItemData<CultData>,
    options,
    userId: string
  ): Promise<any> {
    const cultRuneNames = [...new Set(cultItem.data.runes)]; // No duplicates
    const actorRuneNames = actor.items
      .filter((i) => i.type === ItemTypeEnum.Rune)
      .map((r: ItemData<RuneData>) => r.name);
    const newRuneNames = cultRuneNames.filter((r) => !actorRuneNames.includes(r));
    if (newRuneNames) {
      const runesCompendiumName: string = game.settings.get("rqg", "runesCompendium");
      const runePack = game.packs.get(runesCompendiumName);
      const allRunesIndex = game.settings.get("rqg", "runes"); // Index is previously stored in settings
      const newRuneIds: Array<string> = newRuneNames.map(
        (newRune) => allRunesIndex.find((r) => r.name === newRune)?._id
      );
      const newRuneEntities = await Promise.all(newRuneIds.map((id) => runePack.getEntity(id)));
      newRuneEntities.forEach(async (rune) => await actor.createOwnedItem(rune));
    }
    return;
  }

  /*
   * Unlink the runeMagic spells that was connected with this cult
   */
  static async onDeleteItem(
    actor: RqgActor,
    cultItem: ItemData<CultData>,
    options,
    userId: string
  ): Promise<any | undefined> {
    const cultRuneMagicItems = actor.items.filter(
      // @ts-ignore _id do exist on cultItem object
      (i) => i.type === ItemTypeEnum.RuneMagic && i.data.data.cultId === cultItem._id
    );
    return cultRuneMagicItems.map((i) => {
      return { _id: i._id, "data.cultId": "" };
    });
  }
}
