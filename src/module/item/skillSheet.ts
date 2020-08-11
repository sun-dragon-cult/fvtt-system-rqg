import { SkillCategoryEnum } from "../data-model/item-data/skill";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

export class SkillSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill.toString()],
      template: "systems/rqg/module/item/skillSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): ItemSheetData {
    const data = super.getData();
    data.data.skillCategories = Object.keys(SkillCategoryEnum);
    data.data.isGM = this.actor ? !this.actor.isPC : true;
    return data;
  }
}
