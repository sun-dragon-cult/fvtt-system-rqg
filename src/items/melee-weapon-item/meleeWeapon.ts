import { BaseItem } from "../baseItem";

export class MeleeWeapon extends BaseItem {
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
  static async onEmbedItem(actor, child, options, userId): Promise<any> {
    let embeddedSkillId;
    if (!child.data.skillId && child.data.skillOrigin) {
      try {
        // Add the specified skill if found
        // @ts-ignore
        const skill = await fromUuid(child.data.skillOrigin);
        const embeddedWeaponSkill = await actor.createOwnedItem(skill);
        embeddedSkillId = embeddedWeaponSkill._id;
      } catch (e) {
        ui.notifications.warn("Couldn't find the Skill associated with this weapon.");
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
