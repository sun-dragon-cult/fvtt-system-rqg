import { BaseItem } from "../baseItem";
import { ArmorData, emptyArmor } from "../../data-model/item-data/armorData";
import { RqgActor } from "../../actors/rqgActor";

export class Armor extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  static async onUpdateItem(
    actor: RqgActor,
    itemData: Item.Data<ArmorData>,
    update: any,
    options: any,
    userId: string
  ): Promise<any> {
    // Update the active effect on actor from Item data
    // @ts-ignore
    const uuid = `Actor.${actor.id}.OwnedItem.${itemData._id}`;
    const generatedEffect = Armor.generateActiveEffect(itemData.data);
    // @ts-ignore
    const existingEffects = actor.effects.filter((e) => e.data.origin === uuid);
    if (existingEffects.length > 0) {
      const changes = existingEffects.map((effect) => {
        return {
          //  @ts-ignore
          _id: effect.id,
          changes: generatedEffect.changes,
          disabled: !(itemData.data.equippedStatus === "equipped"),
        };
      });
      await actor.updateEmbeddedEntity("ActiveEffect", changes, {});
    } else {
      // No Active Effect for this armor item existed - create one
      generatedEffect.origin = uuid;
      await actor.createEmbeddedEntity("ActiveEffect", generatedEffect, {});
    }
  }

  // TODO return type should be "active effect data"
  static generateActiveEffect(itemData: ArmorData): any {
    const armorData: ArmorData = itemData || emptyArmor;
    const changes = armorData.hitLocations.map((hitLocationName) => {
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
    };
  }
}
