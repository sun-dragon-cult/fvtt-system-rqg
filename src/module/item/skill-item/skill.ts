import { SkillData } from "../../data-model/item-data/skillData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { BaseItem } from "../baseItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class Skill extends BaseItem {
  entityName: string = ItemTypeEnum.Skill;

  public static async prepareItemForActorSheet(
    item: Item<SkillData>,
    actor: Actor<RqgActorData>
  ) {
    if (actor) {
      // Add the category modifier to be displayed by the Skill sheet
      item.data.data.categoryMod =
        actor.data.data.skillCategoryModifiers[item.data.data.category];

      // Special case for Dodge & Jump
      const dex = actor.data.data.characteristics.dexterity.value;
      if ("Dodge" === item.name) {
        await this.updateBaseChance(item.data, dex * 2);
      }
      if ("Jump" === item.name) {
        await this.updateBaseChance(item.data, dex * 3);
      }

      // Learned chance can't be lower than base chance
      if (item.data.data.baseChance > item.data.data.learnedChance) {
        item.data.data.learnedChance = item.data.data.baseChance;
        // await this.update(data, {
        //   "data.learnedChance": data.data.learnedChance,
        // });
      }

      // Update the skill chance including skill category modifiers.
      // If base chance is 0 you need to have learned something to get category modifier
      item.data.data.chance =
        item.data.data.baseChance > 0 || item.data.data.learnedChance > 0
          ? item.data.data.learnedChance + item.data.data.categoryMod
          : 0;

      // await this.update(data, {
      //   "data.chance": data.data.chance,
      // });
    }
    return item;
  }

  private static async updateBaseChance(
    data: ItemSheetData<SkillData>,
    newBaseChance: number
  ) {
    if (data.data.baseChance !== newBaseChance) {
      if (data.data.learnedChance === data.data.baseChance) {
        data.data.learnedChance = newBaseChance;
        // await this.update(data, {
        //   "data.learnedChance": data.data.learnedChance,
        // });
      }
      data.data.baseChance = newBaseChance;
      // await this.update(data, {
      //   "data.baseChance": data.data.baseChance,
      // });
    }
  }
}
