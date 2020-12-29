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
    itemData: ItemData,
    options,
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
  static async onUpdateItem(
    actor: RqgActor,
    itemData: ItemData,
    update: any,
    options: any,
    userId: string
  ): Promise<any> {}

  /**
   * Will be called when an embedded item is deleted from the actor.
   * @param actor
   * @param itemData - Is actually not a ItemData, but an Object with {data, flags, effects, name, img, type, _id, sort}
   * @param options
   * @param userId
   * @return Data to update other embedded items.
   */
  static async onDeleteItem(
    actor: RqgActor,
    itemData: ItemData,
    options,
    userId: string
  ): Promise<any> {}

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
  static generateActiveEffect(itemData: any): any {
    return;
  }

  // TODO not used (yet)
  static activateActorSheetListeners(html, sheet) {}
}
