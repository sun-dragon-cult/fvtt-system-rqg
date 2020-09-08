import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { Skill } from "./skill-item/skill";
import { BaseItem } from "./baseItem";
import { SkillData } from "../data-model/item-data/skillData";
import { HitLocation } from "./hit-location-item/hitLocation";
import { HitLocationData } from "../data-model/item-data/hitLocationData";

export class RqgItem<DataType = any> extends Item<DataType> {
  prepareData() {
    super.prepareData();
    console.log("*** RqgItem prepareData");
    const itemData: ItemData<DataType> = this.data;

    // TODO Beautify !! // CONFIG.FATEx.itemTypes[item.type].prepareItemForActorSheet(item);
    switch (itemData.type) {
      case ItemTypeEnum.Skill:
        const skillItem = (this as unknown) as RqgItem<SkillData>;
        Skill.prepareItemForActorSheet(skillItem).then((_) => {
          console.log("%%% after prepareItemForActorSheet Skill");
          return this;
        });
        break;

      case ItemTypeEnum.HitLocation:
        const hitLocationItem = (this as unknown) as RqgItem<HitLocationData>;
        HitLocation.prepareItemForActorSheet(hitLocationItem).then((_) => {
          console.log("%%% after prepareItemForActorSheet HitLocation");
          return this;
        });
        break;

      default:
        BaseItem.prepareItemForActorSheet(this).then((_) => {
          console.log("%%% after prepareItemForActorSheet BaseItem");
          return this;
        });
        break;
    }
  }
}
