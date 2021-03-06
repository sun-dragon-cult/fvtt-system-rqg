export class RqgActiveEffect extends ActiveEffect {
  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   * @param {Actor} actor                 The Actor to whom this effect should be applied
   * @param {ActiveEffectChange} change   The change data being applied
   * @return {*}                          The resulting applied value
   * @private
   */
  _applyCustom(actor: Actor, change): any {
    const [affectedItem, itemName, path] = change.key.split(":"); // ex hitLocation:head:data.ap
    const items: Array<Item> = actor.items.filter(
      (i: Item) => i.data.type === affectedItem && i.data.name === itemName
    );
    if (items.length === 1) {
      // Found one and only one item that should be affected (Happy path)
      const currentValue = getProperty(items[0], path) || 0;
      setProperty(items[0], path, change.value + currentValue);
      return change.value;
    } else if (items.length === 0) {
      if (this.data.origin) {
        const message = `Could not find any ${affectedItem} called "${itemName}" on actor "${actor.name}".
        Please either add a ${affectedItem} item called "${itemName}" or modify the item that has this active effect`;
        console.warn("RQG |", message, change, this);
        if (game.user.isGM) {
          ui.notifications && ui.notifications.warn(message, { permanent: true });
        }
      } else {
        // Remove this AE from the actor since it is orphaned
        console.warn("RQG | Deleting the Active Effect since it has no origin", this);
        // @ts-ignore
        actor.deleteEmbeddedEntity("ActiveEffect", this.id);
      }
      return null;
    } else {
      const message = `Apply Active Effect targets more than one item (item ${affectedItem} with name name "${itemName}" is not unique) - This is a bug!`;
      console.error("RQG |", message, change);
      ui.notifications.error(message);
      return null;
    }
  }
}
