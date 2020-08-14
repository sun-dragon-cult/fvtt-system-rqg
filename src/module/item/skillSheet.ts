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
    const data: ItemSheetData = super.getData();
    data.data.skillCategories = Object.keys(SkillCategoryEnum);
    data.data.isGM = this.actor ? !this.actor.isPC : true;

    this.calculateChance(data); // TODO Not waiting for the promise - possible race condition?
    return data;
  }

  async calculateChance(data) {
    if (this.actor) {
      // Add the category modifier to be displayed by the Skill sheet
      data.data.categoryMod = this.actor.data.data.skillCategoryModifiers[
        data.data.category
      ];

      // Special case for Dodge & Jump
      const dex = this.actor.data.data.characteristics.dexterity.value;
      if ("Dodge" === data.item.name) {
        await this.updateBaseChance(data, dex * 2);
      }
      if ("Jump" === data.item.name) {
        await this.updateBaseChance(data, dex * 3);
      }

      // Learned chance can't be lower than base chance
      if (data.data.baseChance > data.data.learnedChance) {
        await this.item.update({ "data.learnedChance": data.data.baseChance });
      }

      // Update the skill chance including skill category modifiers
      data.data.chance =
        data.data.baseChance > 0 || data.data.learnedChance > 0
          ? data.data.learnedChance + data.data.categoryMod
          : 0;
      await this.item.update({ "data.chance": data.data.chance });
    }
  }

  private async updateBaseChance(data, newBaseChance: number) {
    if (data.data.baseChance !== newBaseChance) {
      if (data.data.learnedChance === data.data.baseChance) {
        data.data.learnedChance = newBaseChance;
        await this.item.update({
          "data.learnedChance": data.data.learnedChance,
        });
      }
      data.data.baseChance = newBaseChance;
      await this.item.update({ "data.baseChance": data.data.baseChance });
    }
  }
}
