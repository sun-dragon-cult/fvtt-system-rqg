import { logMisconfiguration, RqgError } from "../system/util";

export class RqgActiveEffect extends ActiveEffect {
  static init() {
    // @ts-ignore 0.8
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect;
  }

  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   */
  _applyCustom(actor: Actor, change: any): any {
    const [affectedItemType, itemName, path] = change.key.split(":"); // ex hitLocation:head:data.ap
    const items: Item[] = actor.items.filter(
      (i: Item) => i.data.type === affectedItemType && i.data.name === itemName
    );
    if (items.length === 1) {
      // Found one and only one item that should be affected (Happy path)
      const affectedItem = items[0];
      const currentValue: number = getProperty(items[0], path) || 0;
      const changeValue: number = Number(change.value) || 0;
      // @ts-ignore 0.8
      foundry.utils.setProperty(affectedItem, path, changeValue + currentValue);
      return changeValue;
    } else if (items.length === 0) {
      if (this.data.origin) {
        logMisconfiguration(
          `Could not find any ${affectedItemType} called "${itemName}" on actor "${actor.name}".
                Please either add a ${affectedItemType} item called "${itemName}" or modify the item that has this active effect`,
          !this.data.disabled,
          change,
          this
        );
      } else {
        // Remove this AE from the actor since it is orphaned
        console.warn("RQG | Deleting the Active Effect since it has no origin", this);
        actor.deleteEmbeddedEntity("ActiveEffect", this.id);
      }
      return null;
    } else {
      const msg = `Apply Active Effect targets more than one item (item ${affectedItemType} with name name "${itemName}" is not unique).`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, change);
    }
  }
}
