import {
  SkillCategoryEnum,
  SkillData,
} from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class SkillSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/module/item/skill-item/skillSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData() {
    const data: ItemSheetData<SkillData> = super.getData();
    data.data.skillCategories = Object.values(SkillCategoryEnum);
    data.data.isGM = this.actor ? !this.actor.isPC : true;
    console.log("*** Calling from skillSheet getData with item", this.item);
    return data;
  }
}
