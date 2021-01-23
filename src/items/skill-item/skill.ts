import { SkillData } from "../../data-model/item-data/skillData";
import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class Skill extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", SkillSheet, {
  //     types: [ItemTypeEnum.Skill],
  //     makeDefault: true,
  //   });
  // }

  public static onActorPrepareDerivedData(item: RqgItem<SkillData>): RqgItem {
    const skillData = item.data.data;
    // Add the category modifier to be displayed by the Skill sheet TODO make another method for this!
    skillData.categoryMod = item.actor.data.data.skillCategoryModifiers[item.data.data.category];

    let mod = 0; // For dodge/swim encumbrance & move quietly modifications

    // Special case for Dodge & Jump TODO swimEncPenalty Complicated :-(
    const dex = item.actor.data.data.characteristics.dexterity.value;
    if ("Dodge" === item.name) {
      Skill.updateBaseChance(skillData, dex * 2);
      mod = -Math.min(
        item.actor.data.data.attributes.equippedEncumbrance,
        item.actor.data.data.attributes.maximumEncumbrance
      );
    }
    if ("Jump" === item.name) {
      Skill.updateBaseChance(skillData, dex * 3);
    }
    if ("Move Quietly" === item.name) {
      mod = -item.actor.items
        .filter((i) => i.data.type === ItemTypeEnum.Armor)
        .reduce((acc, a) => acc + a.data.data.moveQuietlyPenalty, 0);
    }

    // Learned chance can't be lower than base chance
    if (skillData.baseChance > skillData.learnedChance) {
      skillData.learnedChance = skillData.baseChance;
    }

    // Update the skill chance including skill category modifiers.
    // If base chance is 0 you need to have learned something to get category modifier
    skillData.chance =
      skillData.baseChance > 0 || skillData.learnedChance > 0
        ? Math.max(0, skillData.learnedChance + skillData.categoryMod + mod)
        : 0;
    return item;
  }

  private static updateBaseChance(skillData: SkillData, newBaseChance: number) {
    if (skillData.baseChance !== newBaseChance) {
      skillData.baseChance = newBaseChance;
    }
  }
}
