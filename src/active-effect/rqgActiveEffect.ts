import { logMisconfiguration, RqgError } from "../system/util";
import { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import { RqgActor } from "../actors/rqgActor";

export class RqgActiveEffect extends ActiveEffect {
  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect;
  }

  /**
   * Apply an RqgActiveEffect that uses a CUSTOM application mode.
   */
  _applyCustom(actor: RqgActor, change: EffectChangeData): any {
    const [affectedItemType, itemName, path] = change.key.split(":"); // ex hitLocation:Head:system.naturalAp
    const items: Item[] = actor.items.filter(
      (i: Item) => i.type === affectedItemType && i.name === itemName
    );
    if (items.length === 1) {
      // Found one and only one item that should be affected (Happy path)
      const affectedItem = items[0];
      const currentValue: number = getProperty(affectedItem, path) || 0;
      const changeValue: number = Number(change.value) || 0;
      try {
        foundry.utils.setProperty(affectedItem, path, changeValue + currentValue);
      } catch (e) {
        const msg = `Active Effect on item [${affectedItem.name}] in actor [${actor.name}] failed. Probably because of wrong syntax in the active effect attribute key [${change.key}].`;
        ui.notifications?.warn(msg);
        console.warn("RQG |", msg, change, e);
      }
      return changeValue;
    } else if (items.length === 0) {
      // @ts-expect-error system
      if (this.origin && this.origin?.split(".")[1] === actor.id) {
        logMisconfiguration(
          `Could not find any ${affectedItemType} called "${itemName}" on actor "${actor.name}".
                Please either add a ${affectedItemType} item called "${itemName}" or modify the item that has this active effect`,
          // @ts-expect-error system
          !this.disabled,
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
