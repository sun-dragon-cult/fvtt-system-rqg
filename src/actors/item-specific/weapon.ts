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
   * Add the skills specified in the weapon to the actor (if not already there)
   * and connect the weapons with the embedded item skill id.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    assertItemType(child.data.type, ItemTypeEnum.Weapon);
    const oneHandSkillId = await Weapon.getEmbeddedSkillId(
      child.data.data.usage.oneHand.skillId,
      child.data.data.usage.oneHand.skillOrigin,
      actor
    );
    const offHandSkillId = await Weapon.getEmbeddedSkillId(
      child.data.data.usage.offHand.skillId,
      child.data.data.usage.offHand.skillOrigin,
      actor
    );
    const twoHandSkillId = await Weapon.getEmbeddedSkillId(
      child.data.data.usage.twoHand.skillId,
      child.data.data.usage.twoHand.skillOrigin,
      actor
    );
    const missileSkillId = await Weapon.getEmbeddedSkillId(
      child.data.data.usage.missile.skillId,
      child.data.data.usage.missile.skillOrigin,
      actor
    );
    if (!oneHandSkillId || !offHandSkillId || !twoHandSkillId || !missileSkillId) {
      // Didn't find the weapon skill - open the item sheet to let the user select one
      // TODO how to handle this?
      options.renderSheet = true;
    }
    return {
      _id: child.id,
      data: {
        usage: {
          oneHand: { skillId: oneHandSkillId },
          offHand: { skillId: offHandSkillId },
          twoHand: { skillId: twoHandSkillId },
          missile: { skillId: missileSkillId },
        },
      },
    };
  }

  static async getEmbeddedSkillId(
    skillId: string,
    skillOrigin: string,
    actor: RqgActor
  ): Promise<string> {
    let embeddedSkillId = skillId;
    if (!skillId && skillOrigin) {
      try {
        // Add the specified skill if found
        const skill = await fromUuid(skillOrigin).catch((e) => {
          logMisconfiguration(`Couldn't find weapon skill`, true, skillId, e);
        });
        if (!skill) {
          logMisconfiguration(`No melee weapon skill with from skillOrigin ${skillOrigin}`, true);
        } else {
          const sameSkillAlreadyOnActor = actor.items.find((i: RqgItem) => i.name === skill.name);
          const embeddedWeaponSkill = sameSkillAlreadyOnActor
            ? [sameSkillAlreadyOnActor]
            : await actor.createEmbeddedDocuments("Item", [skill.data]);
          embeddedSkillId = embeddedWeaponSkill[0].id ?? "";
        }
      } catch (e) {
        logMisconfiguration(`Couldn't find the Skill associated with this weapon.`, true, e);
      }
    }
    return embeddedSkillId;
  }
}
