import { BaseItem } from "../baseItem";
import { ArmorData, emptyArmor } from "../../data-model/item-data/armorData";

export class Armor extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  // TODO return type should be "active effect data"
  public static generateActiveEffect(itemData: ItemData<ArmorData>): any {
    const armorData: ArmorData = itemData?.data || emptyArmor;
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
      disabled: !armorData.isEquipped,
    };
  }

  static activateActorSheetListeners(html, sheet) {}
}
