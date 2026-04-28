import type { RqgActor } from "../actors/rqgActor";
import type { RqgItem } from "./rqgItem";

/**
 * Separate item specific actions that should be done on embedded items when actor _onCreateDescendantDocuments etc. is called.
 * @deprecated Use the lifecycle methods on the item's DataModel (RqgItemDataModel) instead.
 *             The logic has been moved to the individual DataModel subclasses.
 */
export abstract class AbstractEmbeddedItem {
  /**
   * Will be called when the item is embedded into an actor.
   * @deprecated Use `item.system.onEmbedItem()` instead.
   */
  static async onEmbedItem(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    actor: RqgActor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    child: RqgItem,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {}

  /**
   * Will be called before an embedded (Owned) item is updated.
   * @deprecated Use `item.system.preUpdateItem()` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static preUpdateItem(actor: RqgActor, item: RqgItem, result: any[], options: any): void {}

  /**
   * Will be called after a set of embedded items are deleted.
   * @deprecated Use `item.system.onDeleteItem()` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static onDeleteItem(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any[] {
    return [];
  }

  /**
   * Allows each embedded item to prepare its data.
   * @deprecated Use `item.system.onActorPrepareEmbeddedEntities()` instead.
   */
  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    return item;
  }

  /**
   * Allow updates to the items after active effects is applied.
   * @deprecated Use `item.system.onActorPrepareDerivedData()` instead.
   */
  static onActorPrepareDerivedData(item: RqgItem): RqgItem {
    return item;
  }
}
