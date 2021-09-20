import { logMisconfiguration, RqgError } from "../system/util";
import { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import { RqgActor } from "./rqgActor";

export class RqgActiveEffect extends ActiveEffect {
  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect;
  }

  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   */
  _applyCustom(actor: RqgActor, change: EffectChangeData): any {
    const [affectedItemType, itemName, path] = change.key.split(":"); // ex hitLocation:head:data.armorPoints
    const items: Item[] = actor.items.filter(
      (i: Item) => i.data.type === affectedItemType && i.data.name === itemName
    );
    if (items.length === 1) {
      // Found one and only one item that should be affected (Happy path)
      const affectedItem = items[0];
      const currentValue: number = getProperty(items[0], path) || 0;
      const changeValue: number = Number(change.value) || 0;
      foundry.utils.setProperty(affectedItem, path, changeValue + currentValue);
      return changeValue;
    } else if (items.length === 0) {
      if (this.data.origin && this.data.origin?.split(".")[1] === actor.id) {
        logMisconfiguration(
          `Could not find any ${affectedItemType} called "${itemName}" on actor "${actor.name}".
                Please either add a ${affectedItemType} item called "${itemName}" or modify the item that has this active effect`,
          !this.data.disabled,
          change,
          this
        );
      } else {
        // Remove this AE from the actor since it is orphaned
        console.warn(
          "RQG | Deleting the Active Effect since it has no origin or the origin does not point to this actor",
          this
        );
        actor.deleteEmbeddedDocuments("ActiveEffect", [this.id!]);
      }
      return null;
    } else {
      const msg = `Apply Active Effect targets more than one item (item ${affectedItemType} with name name "${itemName}" is not unique).`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, change);
    }
  }
}
