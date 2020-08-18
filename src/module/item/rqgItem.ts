import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { Skill } from "./skill-item/skill";
import { BaseItem } from "./baseItem";
import { SkillData } from "../data-model/item-data/skillData";
import { HitLocation } from "./hit-location-item/hitLocation";
import { HitLocationData } from "../data-model/item-data/hitLocationData";

export class RqgItem<DataType = any> extends Item<DataType> {
  prepareData() {
    super.prepareData();
    const itemData: ItemData<DataType> = this.data;
    const actor: Actor = this.actor;
    console.log("*** *** RqgItem ", this);

    // TODO Beautify !! // CONFIG.FATEx.itemTypes[item.type].prepareItemForActorSheet(item);
    switch (itemData.type) {
      case ItemTypeEnum.Skill:
        const skillItem = (this as unknown) as RqgItem<SkillData>;
        Skill.prepareItemForActorSheet(skillItem, actor);
        break;

      case ItemTypeEnum.HitLocation:
        const hitLocationItem = (this as unknown) as RqgItem<HitLocationData>;
        HitLocation.prepareItemForActorSheet(hitLocationItem, actor);
        break;

      default:
        BaseItem.prepareItemForActorSheet(this, actor);
        break;
    }
  }
}
