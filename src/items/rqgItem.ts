import { PassionSheet } from "./passion-item/passionSheet";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ElementalRuneSheet } from "./elemental-rune-item/elementalRuneSheet";
import { PowerRuneSheet } from "./power-rune-item/powerRuneSheet";
import { SkillSheet } from "./skill-item/skillSheet";
import { HitLocationSheet } from "./hit-location-item/hitLocationSheet";

export class RqgItem<DataType = any> extends Item<DataType> {
  public static init() {
    CONFIG.Item.entityClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("rqg", PassionSheet, {
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet("rqg", ElementalRuneSheet, {
      types: [ItemTypeEnum.ElementalRune],
      makeDefault: true,
    });
    Items.registerSheet("rqg", PowerRuneSheet, {
      types: [ItemTypeEnum.PowerRune],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SkillSheet, {
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    Items.registerSheet("rqg", HitLocationSheet, {
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });

    // TODO this doesn't compile!? Sheet registration would be better in Item init
    // Item2TypeClass.forEach((itemClass) => itemClass.init());
  }

  // prepareData() {
  //   super.prepareData();
  //   console.log("*** RqgItem prepareData");
  //   const itemData: ItemData<DataType> = this.data;
  // }
}
