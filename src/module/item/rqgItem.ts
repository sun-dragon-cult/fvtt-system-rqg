import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { Skill } from "./skill-item/skill";
import { BaseItem } from "./baseItem";

export class RqgItem extends Item {
  prepareData() {
    super.prepareData();
    const itemData: ItemData = this.data;
    const actor: Actor = this.actor;
    console.log("*** *** RqgItem ", this);

    // TODO Beautify !! // CONFIG.FATEx.itemTypes[item.type].prepareItemForActorSheet(item);
    if (itemData.type === ItemTypeEnum.Skill) {
      Skill.prepareItemForActorSheet(this, actor);
    } else {
      BaseItem.prepareItemForActorSheet(this, actor);
    }
  }
}
