import { logBug, logMisconfiguration } from "../system/util";

export class RqgActiveEffect extends ActiveEffect {
  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   * @param  actor                 The Actor to whom this effect should be applied
   * @param  change   The change data being applied
   * @return {*}                          The resulting applied value
   * @private
   */
  _applyCustom(actor: Actor, change: any): any {
    const [affectedItem, itemName, path] = change.key.split(":"); // ex hitLocation:head:data.ap
    const items: Item[] = actor.items.filter(
      (i: Item) => i.data.type === affectedItem && i.data.name === itemName
    );
    if (items.length === 1) {
      // Found one and only one item that should be affected (Happy path)
      const currentValue = getProperty(items[0], path) || 0;
      setProperty(items[0], path, change.value + currentValue);
      return change.value;
    } else if (items.length === 0) {
      if (this.data.origin) {
        logMisconfiguration(
          `Could not find any ${affectedItem} called "${itemName}" on actor "${actor.name}".
                Please either add a ${affectedItem} item called "${itemName}" or modify the item that has this active effect`,
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
      logBug(
        `Apply Active Effect targets more than one item (item ${affectedItem} with name name "${itemName}" is not unique).`,
        change
      );
      return null;
    }
  }
}
