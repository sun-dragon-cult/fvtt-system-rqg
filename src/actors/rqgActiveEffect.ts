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
      const currentValue = getProperty(items[0], path);
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

  prepareData() {
    if (this.data.origin) {
      // *** Entity is Actor & embedded is OwnedItem (or undefined)
      // this.parent = RqgItem or RqgActor
      // embedded is the armor._id the effect comes from
      // TODO Om embeddedId == undefined så kolla om det ska läggas på?
      if (this.parent instanceof RqgItem) {
        // Generate active effect from Item data
        console.debug("€€€ RqgActiveEffect.prepareData on Item", this);
        const effects = this.data.effects || [];
        effects.forEach((e) =>
          mergeObject(e, ResponsibleItemClass.get(this.data.type).generateActiveEffect(this.data))
        );
      } else if (this.parent instanceof RqgActor) {
        // Update the active effect on actor from Item data
        const [entityName, entityId, embeddedName, embeddedId] = this.data.origin.split(".");
        const item = this.parent.items.get(embeddedId);
        const updatedEffect = item
          ? ResponsibleItemClass.get(item.data.type).generateActiveEffect(item.data)
          : {};
        mergeObject(this.data, updatedEffect);
      } else {
        console.log("€€€ RqgActiveEffect.prepareData on Something else", this);
      }
    }
  }
}
