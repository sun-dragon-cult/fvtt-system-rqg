import { SkillData, SkillItemData } from "../../data-model/item-data/skillData";
import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgError } from "../../system/util";
import { RqgConfig } from "../../system/config";

declare const CONFIG: RqgConfig;

export class Skill extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", SkillSheet, {
  //     types: [ItemTypeEnum.Skill],
  //     makeDefault: true,
  //   });
  // }

  public static onActorPrepareDerivedData(item: RqgItem): RqgItem {
    const skillItem = item as Item<SkillItemData>;
    const skillData = skillItem.data.data;
    const actor = skillItem.actor!;
    if (actor.data.type !== "character") {
      const msg = `Actor is not of type character`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }
    // @ts-ignore 0.8
    const actorData = actor.data.toObject(false);
    // Add the category modifier to be displayed by the Skill sheet TODO make another method for this!
    skillData.categoryMod = actorData.data.skillCategoryModifiers![skillItem.data.data.category];

    let mod = 0; // For dodge/swim encumbrance & move quietly modifications

    // Special case for Dodge & Jump TODO swimEncPenalty Complicated :-(
    const dex = actorData.data.characteristics.dexterity.value;
    if (CONFIG.RQG.skillName.dodge === skillItem.name) {
      Skill.updateBaseChance(skillData, dex * 2);
      if (
        actorData.data.attributes.equippedEncumbrance === undefined ||
        actorData.data.attributes.maximumEncumbrance === undefined
      ) {
        const msg = `Equipped or max ENC was not set`;
        ui.notifications?.warn(msg);
        // ui.notifications?.error(msg);
        // throw new RqgError(msg, actor); // TODO Should it not always be set?
      }
      mod = -Math.min(
        actorData.data.attributes.equippedEncumbrance || 0,
        actorData.data.attributes.maximumEncumbrance || 0
      );
    } else if (CONFIG.RQG.skillName.jump === skillItem.name) {
      Skill.updateBaseChance(skillData, dex * 3);
    } else if (CONFIG.RQG.skillName.moveQuietly === skillItem.name) {
      mod = -Math.max(
        0,
        ...actor.items
          .filter(
            (i: RqgItem) =>
              i.data.type === ItemTypeEnum.Armor && i.data.data.equippedStatus === "equipped"
          )
          .map((a: any) => Math.abs(a.data.data.moveQuietlyPenalty))
      );
    }

    // Learned chance can't be lower than base chance
    if (skillData.baseChance > skillData.learnedChance) {
      skillData.learnedChance = skillData.baseChance;
    }

    // Update the skill chance including skill category modifiers.
    // If base chance is 0 you need to have learned something to get category modifier
    skillData.chance =
      skillData.baseChance > 0 || skillData.learnedChance > 0
        ? Math.max(0, skillData.learnedChance + (skillData.categoryMod || 0) + mod)
        : 0;
    return item;
  }

  private static updateBaseChance(skillData: SkillData, newBaseChance: number): void {
    if (skillData.baseChance !== newBaseChance) {
      skillData.baseChance = newBaseChance;
    }
  }
}
