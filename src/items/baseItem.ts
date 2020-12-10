import { RqgItem } from "./rqgItem";
import { RqgActor } from "../actors/rqgActor";

export abstract class BaseItem {
  // TODO ***
  // public static init() {}

  /**
   * Will be called when the item is embedded into an actor.
   * @param actor
   * @param item
   * @param options
   * @param userId
   * @return Data to update other embedded items.
   */
  static async onEmbedItem(
    actor: RqgActor,
    item: ItemData,
    options,
    userId: string
  ): Promise<any> {}

  /**
   * Will be called when an embedded item is deleted from the actor.
   * @param actor
   * @param item - Is actually not a ItemData, but an Object with {data, flags, effects, name, img, type, _id, sort }
   * @param options
   * @param userId
   */
  static async onDeleteItem(
    actor: RqgActor,
    item: ItemData,
    options,
    userId: string
  ): Promise<any> {}
  /**
   * Allows each embedded item to prepare its data.
   */
  static prepareAsEmbeddedItem(item: RqgItem): RqgItem {
    console.debug("*** BaseItem prepareAsEmbeddedItem item", item);
    return item;
  }

  // TODO return type should be "active effect data"
  public static generateActiveEffect(itemData: ItemData): any {
    return;
  }
}
