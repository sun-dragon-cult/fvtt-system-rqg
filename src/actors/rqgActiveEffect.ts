// @ts-ignore (until foundry-pc-types are updated for 0.7)
export class RqgActiveEffect extends ActiveEffect {
  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   * @param {Actor} actor                 The Actor to whom this effect should be applied
   * @param {ActiveEffectChange} change   The change data being applied
   * @return {*}                          The resulting applied value
   * @private
   */
  // @ts-ignore (until foundry-pc-types are updated for 0.7)
  _applyCustom(actor: Actor, change: ActiveEffectChange): any {
    console.log("*** _applyCustom", actor, change);
    const [affectedItem, itemName, path] = change.key.split(":"); // ex hitLocation:head:data.ap
    const items = actor.items.filter(
      (i: Item) => i.data.type === affectedItem && i.data.name === itemName
    );
    if (items.length > 1) {
      console.error("Rqg apply active effect targets more than one item", path);
      return null;
    } else if (items.length === 0) {
      console.warn(
        "Rqg apply active effect didn't match any item",
        path,
        items
      );
      return null;
    } else {
      console.log(
        "****E*#*#*##*#*# owned item and not yet transfered",
        // @ts-ignore 0.7
        items[0].isOwned
      );

      const current = getProperty(items[0].data, path);
      console.log(
        "RqgActiveEffect._applyCustom: putting",
        change.value,
        " on",
        path,
        " on",
        items[0]
      );
      console.log(
        "*** current -> change -> total",
        current,
        change.value,
        change.value + current
      );
      setProperty(items[0].data, path, change.value + current);
      return change.value;
    }
  }
}
