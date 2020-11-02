import { SkillData } from "../../data-model/item-data/skillData";
import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";

export class Skill extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", SkillSheet, {
  //     types: [ItemTypeEnum.Skill],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<SkillData>): RqgItem {
    const skillData = item.data.data;
    // Add the category modifier to be displayed by the Skill sheet TODO make another method for this!
    skillData.categoryMod =
      item.actor.data.data.skillCategoryModifiers[item.data.data.category];

    // Special case for Dodge & Jump
    const dex = item.actor.data.data.characteristics.dexterity.value;
    if ("Dodge" === item.name) {
      Skill.updateBaseChance(skillData, dex * 2);
    }
    if ("Jump" === item.name) {
      Skill.updateBaseChance(skillData, dex * 3);
    }

    // Learned chance can't be lower than base chance
    if (skillData.baseChance > skillData.learnedChance) {
      skillData.learnedChance = skillData.baseChance;
    }

    // Update the skill chance including skill category modifiers.
    // If base chance is 0 you need to have learned something to get category modifier
    skillData.chance =
      skillData.baseChance > 0 || skillData.learnedChance > 0
        ? skillData.learnedChance + skillData.categoryMod
        : 0;
    return item;
  }

  private static updateBaseChance(skillData: SkillData, newBaseChance: number) {
    if (skillData.baseChance !== newBaseChance) {
      skillData.baseChance = newBaseChance;
    }
  }
}