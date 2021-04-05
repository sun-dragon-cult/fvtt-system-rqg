import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";

export class MissileWeapon extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", MissileWeaponSheet, {
  //     types: [ItemTypeEnum.MissileWeapon],
  //     makeDefault: true,
  //   });
  // }

  /*
   * Add the skill specified in the weapon to the actor (if not already there)
   * and connect the weapon with the embedded item skill id.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: any,
    options: any,
    userId: string
  ): Promise<any> {
    let embeddedSkillId;
    if (!child.data.skillId && child.data.skillOrigin) {
      try {
        // Add the specified skill if found
        const skill = (await fromUuid(child.data.skillOrigin)) as RqgItem;
        const embeddedWeaponSkill = await actor.createOwnedItem(skill.data);
        embeddedSkillId = embeddedWeaponSkill._id;
      } catch (e) {
        ui.notifications?.warn("Couldn't find the Skill associated with this weapon.");
      }
    }
    if (embeddedSkillId) {
      return { _id: child._id, data: { skillId: embeddedSkillId } };
    } else {
      // Didn't find the weapon skill - open the item sheet to let the user select one
      options.renderSheet = true;
      return;
    }
  }
}
