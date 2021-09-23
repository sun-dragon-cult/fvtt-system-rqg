import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { RqgActor } from "../rqgActor";
import { assertItemType, logMisconfiguration } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getSameLocationUpdates } from "./shared/physicalItemUtil";

export class Weapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", WeaponSheet, {
  //     types: [ItemTypeEnum.Weapon],
  //     makeDefault: true,
  //   });
  // }

  static preUpdateItem(actor: RqgActor, weapon: RqgItem, updates: object[], options: any): void {
    if (weapon.data.type === ItemTypeEnum.Weapon) {
      updates.push(...getSameLocationUpdates(actor, weapon, updates));
    }
  }

  /*
   * Add the skill specified in the weapon to the actor (if not already there)
   * and connect the weapon with the embedded item skill id.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let embeddedSkillId;
    assertItemType(child.data.type, ItemTypeEnum.Weapon);

    if (!child.data.data.skillId && child.data.data.skillOrigin) {
      try {
        // Add the specified skill if found
        const skill = await fromUuid(child.data.data.skillOrigin).catch((e) => {
          logMisconfiguration(`Couldn't find weapon skill`, true, child.data, e);
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
        logMisconfiguration(`Couldn't find the Skill associated with this weapon.`, true, e);
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
