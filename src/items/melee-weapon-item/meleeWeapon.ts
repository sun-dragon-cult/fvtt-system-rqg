import { BaseItem } from "../baseItem";

export class MeleeWeapon extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", MeleeWeaponSheet, {
  //     types: [ItemTypeEnum.MeleeWeapon],
  //     makeDefault: true,
  //   });
  // }
  static async onEmbedItem(actor, child, options, userId): Promise<any | undefined> {
    let newSkillId;
    if (!child.data.skillId && child.data.skillOrigin) {
      try {
        // Add the specified skill if found
        // @ts-ignore
        const skill = await fromUuid(child.data.skillOrigin);
        const embeddedWeaponSkill = await actor.createOwnedItem(skill);
        newSkillId = embeddedWeaponSkill._id;
      } catch (e) {
        ui.notifications.warn("Couldn't find the Skill associated with this weapon.");
      }
    }
    if (!newSkillId) {
      // Didn't find any weapon skill - open the item sheet to let the user select one
      options.renderSheet = true;
    }
    return newSkillId ? { _id: child._id, data: { skillId: newSkillId } } : undefined;
  }

  static activateActorSheetListeners(html, sheet) {}
}
