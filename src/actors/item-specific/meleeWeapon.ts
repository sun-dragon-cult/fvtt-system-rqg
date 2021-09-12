import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { assertItemType, logMisconfiguration } from "../../system/util";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getSameLocationUpdates } from "./shared/physicalItemUtil";

export class MeleeWeapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", MeleeWeaponSheet, {
  //     types: [ItemTypeEnum.MeleeWeapon],
  //     makeDefault: true,
  //   });
  // }

  static preUpdateItem(
    actor: RqgActor,
    meleeWeapon: RqgItem,
    updates: object[],
    options: any
  ): void {
    if (meleeWeapon.data.type === ItemTypeEnum.MeleeWeapon) {
      updates.push(...getSameLocationUpdates(actor, meleeWeapon, updates));
    }
  }

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
    assertItemType(child.data.type, ItemTypeEnum.MeleeWeapon);

    if (!child.data.data.skillId && child.data.data.skillOrigin) {
      try {
        // Add the specified skill if found
        const skill = await fromUuid(child.data.data.skillOrigin).catch((e) => {
          logMisconfiguration(`Couldn't find melee weapon skill`, true, child.data, e);
        });
        if (!skill) {
          logMisconfiguration(
            `No melee weapon skill with from skillOrigin ${child.data.data.skillOrigin}`,
            true,
            child.data
          );
        } else {
          const sameSkillAlreadyOnActor = actor.items.find((i: RqgItem) => i.name === skill.name);
          const embeddedWeaponSkill = sameSkillAlreadyOnActor
            ? [sameSkillAlreadyOnActor]
            : await actor.createEmbeddedDocuments("Item", [skill.data]);
          embeddedSkillId = embeddedWeaponSkill[0].id; // A weapon can only have 1 skill for now
        }
      } catch (e) {
        logMisconfiguration(`Couldn't find the Skill associated with this melee weapon.`, true, e);
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
