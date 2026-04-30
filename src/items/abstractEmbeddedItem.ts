import type { RqgActor } from "../actors/rqgActor";
import type { RqgItem } from "./rqgItem";

/**
 * Separate item specific actions that should be done on embedded items when actor _onCreateDescendantDocuments etc. is called.
 * @deprecated Lifecycle methods have moved to RqgItemDataModel instance methods.
 *             Utility-only subclasses (Skill, Weapon, RuneMagic) are retained for static helpers.
 */
export abstract class AbstractEmbeddedItem {
  /**
   * Will be called when the item is embedded into an actor.
   * @deprecated Use RqgItemDataModel.onEmbedItem() instead.
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
   * @deprecated Use RqgItemDataModel.preUpdateItem() instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static preUpdateItem(actor: RqgActor, item: RqgItem, result: any[], options: any): void {}

  /**
   * Will be called after a set of embedded items are deleted.
   * @deprecated Use RqgItemDataModel.onDeleteItem() instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static onDeleteItem(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any[] {
    return [];
  }

  /**
   * Allows each embedded item to prepare its data.
   * @deprecated Use RqgItemDataModel.onActorPrepareEmbeddedEntities() instead.
   */
  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    return item;
  }

  /**
   * Allow updates to the items after active effects is applied.
   * @deprecated Use RqgItemDataModel.onActorPrepareDerivedData() instead.
   */
  static onActorPrepareDerivedData(item: RqgItem): RqgItem {
    return item;
  }
}
