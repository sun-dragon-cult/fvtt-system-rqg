import { BaseItem } from "../baseItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class Cult extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", CultSheet, {
  //     types: [ItemTypeEnum.Cult],
  //     makeDefault: true,
  //   });
  // }

  static async onEmbedItem(actor, child, options, userId): Promise<any | undefined> {
    const cultRuneNames = [...new Set(child.data.runes)]; // No duplicates
    const actorRuneNames = actor.items
      .filter((i) => i.type === ItemTypeEnum.Rune)
      .map((r) => r.name);
    const newRuneNames = cultRuneNames.filter((r) => !actorRuneNames.includes(r));
    if (newRuneNames) {
      const runesCompendiumName = game.settings.get("rqg", "runesCompendium");
      const runePack = game.packs.get(runesCompendiumName);
      const allRunesIndex = game.settings.get("rqg", "runes"); // Index is previously stored in settings
      const newRuneIds = newRuneNames.map(
        (newRune) => allRunesIndex.find((r) => r.name === newRune)?._id
      );
      const newRuneEntities = await Promise.all(newRuneIds.map((id) => runePack.getEntity(id)));
      newRuneEntities.forEach(async (rune) => await actor.createOwnedItem(rune));
    }
    return;
  }

  static activateActorSheetListeners(html, sheet) {}
}
