import { RqgItem } from "./rqgItem";
import { RqgActor } from "../actors/rqgActor";

export abstract class BaseItem {
  // TODO ***
  // public static init() {}

  /**
   * Will be called when the item is embedded into an actor.
   * @param actor
   * @param itemData - Is actually not a ItemData, but an Object with {data, flags, effects, name, img, type, _id, sort}
   * @param options
   * @param userId
   * @return Data to update other embedded items.
   */
  static async onEmbedItem(
    actor: RqgActor,
    itemData: Item.Data,
    options: any,
    userId: string
  ): Promise<any> {}

  /**
   * Will be called when an embedded (Owned) item is updated.
   * @param actor
   * @param itemData - Is actually not a ItemData, but an Object with {data, flags, effects, name, img, type, _id, sort}
   * @param update
   * @param options
   * @param userId
   * @return Data to update other embedded items.
   */
  static onUpdateItem(
    actor: RqgActor,
    itemData: Item.Data,
    update: any,
    options: any,
    userId: string
  ): any {}

  /**
   * Will be called when an embedded item is deleted from the actor.
   * @param actor
   * @param itemData - Is actually not a ItemData, but an Object with {data, flags, effects, name, img, type, _id, sort}
   * @param options
   * @param userId
   * @return Data to update other embedded items.
   */
  static onDeleteItem(actor: RqgActor, itemData: Item.Data, options: any, userId: string): any {}

  /**
   * Allows each embedded item to prepare its data.
   */
  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    return item;
  }

  /**
   * Allow updates to the items after active effects is applied.
   */
  static onActorPrepareDerivedData(item: RqgItem): RqgItem {
    return item;
  }

  // TODO return type should be "active effect data"
  static generateActiveEffect(itemData: any): DeepPartial<ActiveEffect.Data> {
    return {};
  }

  // TODO not used (yet)
  static activateActorSheetListeners(html: JQuery, sheet: any) {}
}
