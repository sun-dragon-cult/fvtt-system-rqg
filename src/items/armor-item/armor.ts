import { BaseEmbeddedItem } from "../baseEmbeddedItem";
import { ArmorData, emptyArmor } from "../../data-model/item-data/armorData";
import { RqgActor } from "../../actors/rqgActor";
import Change = ActiveEffect.Change;
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgError } from "../../system/util";

export class Armor extends BaseEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  static onUpdateItem(
    actor: RqgActor,
    item: RqgItem,
    update: any,
    options: any,
    userId: string
  ): any {
    if (item.data.type !== ItemTypeEnum.Armor) {
      const msg = `Tried to update something else than armor`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item, actor);
    }

    // Update the active effect on actor from Item data
    const uuid = `Actor.${actor.id}.Item.${item.id}`;
    const generatedEffect = Armor.generateActiveEffect(item.data.data);
    const existingEffects = actor.effects.filter((e) => e.data.origin === uuid);
    if (existingEffects.length > 0) {
      const shouldBeDisabled = item.data.data.equippedStatus !== "equipped";
      const changes = existingEffects.map((effect) => {
        return {
          _id: effect.id,
          changes: generatedEffect.changes,
          disabled: shouldBeDisabled,
        };
      });
      // @ts-ignore 0.8
      actor.updateEmbeddedDocuments("ActiveEffect", changes, {});
    } else {
      // No Active Effect for this armor item existed - create one
      generatedEffect.origin = uuid;
      // @ts-ignore 0.8
      actor.createEmbeddedDocuments("ActiveEffect", [generatedEffect], {});
    }
  }

  // TODO return type should be "active effect data"
  static generateActiveEffect(itemData: ArmorData): ActiveEffect.Data {
    const armorData = itemData || emptyArmor;
    const changes: DeepPartial<Change[]> = armorData.hitLocations.map((hitLocationName) => {
      return {
        key: `hitLocation:${hitLocationName}:data.data.ap`,
        value: armorData.absorbs,
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      };
    });

    return {
      label: "Armor",
      icon: "icons/svg/ice-shield.svg",
      changes: changes,
      transfer: true,
      disabled: !(armorData.equippedStatus === "equipped"),
    } as ActiveEffect.Data;
  }
}
