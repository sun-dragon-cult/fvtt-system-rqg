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

  getData() {
    const data = super.getData();
    data.data.skillCategories = Object.keys(SkillCategoryEnum);
    data.data.isGM = this.actor ? !this.actor.isPC : true;
    // TODO Handle token / actor
    const mod = this.actor?.data.data.skillCategoryModifiers[
      data.data.category
    ];
    const categoryMod = mod ? mod : 0;

    // TODO How to handle skill category modifiers - used both in item and in actor?
    // Unless you've learned a base 0 skill you can't use your category modifier.
    if (data.data.baseChance > 0 || data.data.learnedChance > 0) {
      data.data.chance = data.data.learnedChance + categoryMod;
    } else {
      data.data.chance = 0;
    }

    return data;
  }
}
