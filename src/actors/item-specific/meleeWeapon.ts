import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { logMisconfiguration } from "../../system/util";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class MeleeWeapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", MeleeWeaponSheet, {
  //     types: [ItemTypeEnum.MeleeWeapon],
  //     makeDefault: true,
  //   });
  // }

  /*
   * Add the skill specified in the weapon to the actor (if not already there)
   * and connect the weapon with the embedded skill item id.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let embeddedSkillId;
    if (
      child.data.type === ItemTypeEnum.MeleeWeapon &&
      !child.data.data.skillId &&
      child.data.data.skillOrigin
    ) {
      try {
        // Add the specified skill if found
        // @ts-ignore TODO wrong types
        const skill = (await fromUuid(child.data.data.skillOrigin).catch(() => {
          logMisconfiguration(
            `Couldn't find melee weapon skill with uuid from skillOrigin ${
              (child.data.data as any).skillOrigin
            }`,
            true,
            child.data
          );
        })) as RqgItem;
        // @ts-ignore 0.8
        const embeddedWeaponSkill = await actor.createEmbeddedDocuments("Item", [skill.data]);
        embeddedSkillId = embeddedWeaponSkill[0].id; // A weapon can only have 1 skill for now
      } catch (e) {
        logMisconfiguration("Couldn't find the Skill associated with this weapon.", true);
      }
    }
    if (embeddedSkillId) {
      return { _id: child.id, data: { skillId: embeddedSkillId } };
    } else {
      // Didn't find the weapon skill - open the item sheet to let the user select one
      options.renderSheet = true;
      return;
    }
  }
}
