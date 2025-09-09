import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { assertDocumentSubType, isDocumentSubType } from "../../system/util";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { systemId } from "../../system/config";
import type { ArmorItem } from "@item-model/armorData.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";
import type { SkillItem } from "@item-model/skillData.ts";

export class Skill extends AbstractEmbeddedItem {
  public static override onActorPrepareDerivedData(skillItem: RqgItem): RqgItem {
    assertDocumentSubType<SkillItem>(
      skillItem,
      [ItemTypeEnum.Skill],
      "RQG.Item.Notification.PrepareDerivedDataNotSkillError",
    );
    const actor = skillItem.actor!;
    assertDocumentSubType<CharacterActor>(
      actor,
      [ActorTypeEnum.Character],
      "RQG.Item.Notification.ActorNotCharacterError",
    );
    const actorData = actor.toObject(false).system; // TODO Why use toObject ???
    // Add the category modifier to be displayed by the Skill sheet TODO make another method for this!
    skillItem.system.categoryMod = actorData.skillCategoryModifiers![skillItem.system.category];

    let mod = 0;

    // Special modifiers for Dodge & Move Quietly
    const skillRqid = skillItem.getFlag(systemId, documentRqidFlags)?.id;
    if (skillRqid === CONFIG.RQG.skillRqid.dodge) {
      mod = -Math.min(
        // mod is equipped ENC modifier
        actorData.attributes.encumbrance?.equipped || 0,
        actorData.attributes.encumbrance?.max || 0,
      );
    } else if (skillRqid === CONFIG.RQG.skillRqid.moveQuietly) {
      // mod is the penalty from equipped armor
      mod = -Math.max(
        0,
        ...actor.items
          .filter(
            (i: RqgItem) =>
              isDocumentSubType<ArmorItem>(i, ItemTypeEnum.Armor) &&
              i.system.equippedStatus === "equipped",
          )
          .map((a: any) => Math.abs(a.system.moveQuietlyPenalty)),
      );
    }

    // Calculate the effective skill chance including skill category modifier.
    // If skill base chance is 0 you need to have studied to get an effective chance
    skillItem.system.chance =
      skillItem.system.baseChance > 0 ||
      skillItem.system.baseChance + skillItem.system.gainedChance > 0
        ? Math.max(
            0,
            skillItem.system.baseChance +
              skillItem.system.gainedChance +
              (skillItem.system.categoryMod || 0) +
              mod,
          )
        : 0;
    return skillItem;
  }

  static dodgeBaseChance(dex: number): number {
    return dex * 2;
  }

  static jumpBaseChance(dex: number): number {
    return dex * 3;
  }
}
