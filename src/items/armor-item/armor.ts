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
  public static activeEffectChanges(item: RqgItem): any {
    const armorData: ArmorData = item?.data?.data || emptyArmor;
    console.log("armorItem#activeEffectChanges", item);
    return armorData.hitLocations.map((hitLocationName) => {
      return {
        key: `hitLocation:${hitLocationName}:data.ap`,
        value: armorData.absorbs,
        mode: 0, // TODO ACTIVE_EFFECT_MODES.CUSTOM
      };
    });
  }

  static activateActorSheetListeners(html, sheet) {}
}
