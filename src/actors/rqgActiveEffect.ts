// @ts-nocheck (until foundry-pc-types are updated for 0.7)
import { ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import { RqgActor } from "./rqgActor";

export class RqgActiveEffect extends ActiveEffect {
  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   * @param {Actor} actor                 The Actor to whom this effect should be applied
   * @param {ActiveEffectChange} change   The change data being applied
   * @return {*}                          The resulting applied value
   * @private
   */
  _applyCustom(actor: Actor, change: ActiveEffectChange): any {
    console.log("*** _applyCustom", actor, change);
    const [affectedItem, itemName, path] = change.key.split(":"); // ex hitLocation:head:data.ap
    const items = actor.items.filter(
      (i: Item) => i.data.type === affectedItem && i.data.name === itemName
    );
    if (items.length > 1) {
      console.error(
        "Rqg apply active effect targets more than one item (item name not unique)",
        path
      );
      return null;
    } else if (items.length === 0) {
      console.warn(
        "Rqg apply active effect didn't match any item",
        path,
        items
      );
      return null;
    } else {
      const currentValue = getProperty(items[0], path);
      console.log(
        "RqgActiveEffect._applyCustom: adding",
        change.value,
        " on",
        path,
        " on",
        items[0]
      );
      const originItem = actor.getOwnedItem(
        change.effect.data.origin.split(".")[3]
      );
      if (originItem?.data.data.equipped) {
        setProperty(items[0], path, change.value + currentValue);
      }
      return change.value;
    }
  }

  prepareData() {
    if (this.data.origin) {
      const [
        entityName,
        entityId,
        embeddedName,
        embeddedId,
      ] = this.data.origin.split(".");
      // *** Entity is Actor & embedded is OwnedItem (or undefined)
      // this.parent = RqgItem or RqgActor
      // embedded is the armor._id the effect comes from
      // TODO Om embeddedId == undefined så kolla om det ska läggas på?
      console.log(
        "^^^ RqgActiveEffect originItem",
        entityName,
        entityId,
        embeddedName,
        embeddedId,
        this.parent.type
      );
      if (this.parent instanceof RqgItem) {
        console.log("€€€ AE on Item", this.data.changes);
      } else if (this.parent instanceof RqgActor) {
        // Update the AE on actor
        // TODO Merge full effect - not just changes? *************
        // TODO Check transfer flags / etc
        console.log("€€€ AE on Actor", this);
        const item = this.parent.items.get(embeddedId);
        const newEffect = ResponsibleItemClass.get(
          item.data.type
        ).generateActiveEffect(item);
        this.data.changes = newEffect.changes;
      } else {
        console.log("€€€ AE on Something else", this);
      }
    }
  }
}
