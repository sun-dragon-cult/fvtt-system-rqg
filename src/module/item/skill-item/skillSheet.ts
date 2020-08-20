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

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: SkillData = sheetData.item.data;
    data.skillCategories = Object.values(SkillCategoryEnum);
    data.isGM = this.actor ? !this.actor.isPC : true;
    return sheetData;
  }
}
