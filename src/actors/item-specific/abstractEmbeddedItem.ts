import { RqgItem } from "../../items/rqgItem";
import { RqgActor } from "../rqgActor";

/**
 * Separate item specific actions that should be done on embedded items when actor _onCreateEmbeddedDocuments etc. is called.
 */
export abstract class AbstractEmbeddedItem {
  // TODO ***
  // public static init() {}

  /**
   * Will be called when the item is embedded into an actor.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {}

  /**
   * Will be called before an embedded (Owned) item is updated.
   */
  static preUpdateItem(actor: RqgActor, item: RqgItem, result: object[], options: any): void {}

  /**
   * Will be called when an embedded (Owned) item is updated.
   * @deprecated use preUpdateItem instead to avoid extra updates
   */
  static onUpdateItem(
    actor: RqgActor,
    item: RqgItem,
    update: any,
    options: any,
    userId: string
  ): any {}

  static onDeleteItem(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any {}

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
