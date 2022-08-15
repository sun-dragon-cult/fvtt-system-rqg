import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../../actors/rqgActor";
import { getAvailableRunes, getGame, localize, RqgError } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { Rqid } from "../../system/api/rqidApi";

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
      // Until we use Rqid for actual linking, convert the name to Rqid
      const newRuneRqids = getAvailableRunes()
        .filter((r) => newRuneNames.includes(r.name))
        .map((r) => r.rqid);
      const gameLanguage = getGame().settings.get("core", "language") as string;
      const runes = await Promise.all(
        newRuneRqids.map(async (r) => await Rqid.fromRqid(r, gameLanguage))
      );
      const runesData = runes.map((r) => r?.data);
      await actor.createEmbeddedDocuments("Item", runesData);
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
