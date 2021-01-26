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
    itemData: ItemData,
    update: any,
    options: any,
    userId: string
  ): Promise<any> {
    // Update the active effect on actor from Item data
    // @ts-ignore
    const uuid = `Actor.${actor.id}.OwnedItem.${itemData._id}`;
    // @ts-ignore
    const existingEffect = actor.effects.find((e) => e.data.origin === uuid);
    if (existingEffect) {
      const changes = Armor.generateActiveEffect(itemData.data).changes;
      await actor.updateEmbeddedEntity(
        "ActiveEffect",
        {
          _id: existingEffect.id,
          changes: changes,
          disabled: !itemData.data.isEquipped,
        },
        {}
      );
    } else {
      // Just in case - make sure the armor has a corresponding AE
      await actor.createEmbeddedEntity("ActiveEffect", Armor.generateActiveEffect(itemData.data));
    }
  }

  // TODO return type should be "active effect data"
  static generateActiveEffect(itemData: ArmorData): any {
    const armorData: ArmorData = itemData || emptyArmor;
    const changes = armorData.hitLocations.map((hitLocationName) => {
      return {
        key: `hitLocation:${hitLocationName}:data.data.ap`,
        value: armorData.absorbs,
        // @ts-ignore
        mode: ACTIVE_EFFECT_MODES.CUSTOM,
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
