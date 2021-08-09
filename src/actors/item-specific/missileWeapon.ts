import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { RqgActor } from "../rqgActor";
import { logMisconfiguration, RqgError } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getSameLocationUpdates } from "./shared/physicalItemUtil";

export class MissileWeapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", MissileWeaponSheet, {
  //     types: [ItemTypeEnum.MissileWeapon],
  //     makeDefault: true,
  //   });
  // }

  static preUpdateItem(
    actor: RqgActor,
    missileWeapon: RqgItem,
    updates: object[],
    options: any
  ): void {
    if (missileWeapon.data.type === ItemTypeEnum.MissileWeapon) {
      updates.push(...getSameLocationUpdates(actor, missileWeapon, updates));
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
    if (child.data.type !== ItemTypeEnum.MissileWeapon) {
      const msg = `Tried to embed something else than a missileWeapon`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, child, actor);
    }

    if (!child.data.data.skillId && child.data.data.skillOrigin) {
      try {
        // Add the specified skill if found
        const skill = await fromUuid(child.data.data.skillOrigin).catch(() => {
          logMisconfiguration(
            `Couldn't find missile weapon skill with uuid from skillOrigin ${
              (child.data.data as any).skillOrigin
            }`,
            true,
            child.data
          );
        });
        // @ts-ignore 0.8
        const embeddedWeaponSkill = await actor.createEmbeddedDocuments("Item", [skill.data]);
        embeddedSkillId = embeddedWeaponSkill[0].id; // A weapon can only have 1 skill for now
      } catch (e) {
        ui.notifications?.warn("Couldn't find the Skill associated with this weapon.");
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
