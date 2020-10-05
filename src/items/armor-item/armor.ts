import { BaseItem } from "../baseItem";
import { ArmorData, emptyArmor } from "../../data-model/item-data/armorData";
import { RqgItem } from "../rqgItem";

export class Armor extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", ArmorSheet, {
  //     types: [ItemTypeEnum.Armor],
  //     makeDefault: true,
  //   });
  // }

  // TODO return type should be "active effect data"
  public static generateActiveEffect(item: RqgItem<ArmorData>): any {
    const armorData: ArmorData = item?.data?.data || emptyArmor;
    const changes = armorData.hitLocations.map((hitLocationName) => {
      return {
        key: `hitLocation:${hitLocationName}:data.data.ap`,
        value: armorData.absorbs,
        mode: 0, // TODO ACTIVE_EFFECT_MODES.CUSTOM
      };
    });

    return {
      label: "Armor",
      icon: "icons/svg/ice-shield.svg",
      changes: changes,
      transfer: true,
      disabled: false,
    };
  }

  static activateActorSheetListeners(html, sheet) {}
}
