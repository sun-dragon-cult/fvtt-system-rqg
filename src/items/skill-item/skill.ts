import { SkillData } from "../../data-model/item-data/skillData";
import { BaseItem } from "../baseItem";

export class Skill extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", SkillSheet, {
  //     types: [ItemTypeEnum.Skill],
  //     makeDefault: true,
  //   });
  // }

  public static async prepareItemForActorSheet(item: Item<SkillData>) {
    if (item.actor) {
      const newData = duplicate(item.data.data);
      // Add the category modifier to be displayed by the Skill sheet
      item.data.data.categoryMod =
        item.actor.data.data.skillCategoryModifiers[item.data.data.category];

      // Special case for Dodge & Jump
      const dex = item.actor.data.data.characteristics.dexterity.value;
      if ("Dodge" === item.name) {
        Skill.updateBaseChance(newData, dex * 2);
      }
      if ("Jump" === item.name) {
        Skill.updateBaseChance(newData, dex * 3);
      }

      // Learned chance can't be lower than base chance
      if (newData.baseChance > newData.learnedChance) {
        newData.learnedChance = newData.baseChance;
      }

      // Update the skill chance including skill category modifiers.
      // If base chance is 0 you need to have learned something to get category modifier
      item.data.data.chance =
        item.data.data.baseChance > 0 || item.data.data.learnedChance > 0
          ? item.data.data.learnedChance + item.data.data.categoryMod
          : 0;

      // Persist if changed - TODO Look over derived vs persisted data!
      if (JSON.stringify(newData) !== JSON.stringify(item.data.data)) {
        item = await item.update({ data: newData }, {});
      }
    }
    return item;
  }

  private static updateBaseChance(skillData: SkillData, newBaseChance: number) {
    if (skillData.baseChance !== newBaseChance) {
      if (skillData.learnedChance === skillData.baseChance) {
        skillData.learnedChance = newBaseChance;
      }
    }
  }
}
