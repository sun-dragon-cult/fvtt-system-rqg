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
    const changes = Armor.generateActiveEffect(itemData.data).changes;
    // @ts-ignore
    const existingEffect = actor.effects.find((e) => e.data.origin === uuid);
    if (existingEffect) {
      await actor.updateEmbeddedEntity(
        "ActiveEffect",
        {
          _id: existingEffect.id,
          changes: changes,
          disabled: !(itemData.data.equippedStatus === "equipped"),
        },
        {}
      );
    } else {
      console.error("Armor#onUpdateItem actor:", actor, itemData, " update:", update);
      ui.notifications.error(
        `This armor item (${itemData.name}) do not have an Active Effect. This is a bug!`,
        {
          permanent: true,
        }
      );
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
