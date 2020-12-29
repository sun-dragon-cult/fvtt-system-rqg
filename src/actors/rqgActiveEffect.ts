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
    if (items.length > 1) {
      console.error(
        "Rqg apply active effect targets more than one item (item name not unique)",
        path
      );
      return null;
    } else if (items.length === 0) {
      console.warn("Rqg apply active effect didn't match any item", path, items);
      return null;
    } else {
      const currentValue = getProperty(items[0], path) || 0;
      console.debug(
        "RqgActiveEffect._applyCustom: adding",
        change.value,
        " on",
        path,
        " on",
        items[0]
      );
      setProperty(items[0], path, change.value + currentValue);
      return change.value;
    }
  }
}
