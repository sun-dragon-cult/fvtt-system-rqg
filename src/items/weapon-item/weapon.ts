import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "@actors/rqgActor.ts";
import {
  assertDocumentSubType,
  localize,
  logMisconfiguration,
  mergeArraysById,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { Rqid } from "../../system/api/rqidApi";
import type { WeaponItem } from "@item-model/weaponData.ts";

import Document = foundry.abstract.Document;
import type { SkillItem } from "@item-model/skillData.ts";

export class Weapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", WeaponSheet, {
  //     types: [ItemTypeEnum.Weapon],
  //     makeDefault: true,
  //   });
  // }

  static override preUpdateItem(
    actor: RqgActor,
    weapon: RqgItem,
    updates: object[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
  ): void {
    if (weapon.type === ItemTypeEnum.Weapon.toString()) {
      mergeArraysById(updates, getLocationRelatedUpdates(actor.items.contents, weapon, updates));
    }
  }

  /*
   * Add the skills specified in the weapon to the actor (if not already there)
   * and connect the weapons with the embedded item skill id.
   */
  static override async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {
    assertDocumentSubType<WeaponItem>(child, ItemTypeEnum.Weapon);

    const actorHasRightArm = !!actor.getBestEmbeddedDocumentByRqid("i.hit-location.right-arm");

    if (!child.system.isNatural && !actorHasRightArm) {
      // To be able to use a physical weapon you need an arm.
      // This prevents donkeys to get sword skills just because they carry swords.
      return {};
    }

    const succeeded = await Promise.all([
      Weapon.embedLinkedSkill(child.system.usage.oneHand.skillRqidLink?.rqid, actor),
      Weapon.embedLinkedSkill(child.system.usage.offHand.skillRqidLink?.rqid, actor),
      Weapon.embedLinkedSkill(child.system.usage.twoHand.skillRqidLink?.rqid, actor),
      Weapon.embedLinkedSkill(child.system.usage.missile.skillRqidLink?.rqid, actor),
    ]);
    if (succeeded.includes(false)) {
      // Didn't find one of the weapon skills - open the item sheet to let the user select one
      // TODO how to handle this?
      options.renderSheet = true;
    }
    // Thrown weapons should decrease quantity of themselves
    const projectileId = child.system.isThrownWeapon ? child.id : child.system.projectileId;

    return {
      _id: child.id,
      system: {
        projectileId: projectileId,
      },
    };
  }

  /**
   * Checks if the specified skill is already owned by the actor.
   * If not it embeds the referenced skill.
   * Returns false if the linked skill could not be found.
   */
  public static async embedLinkedSkill(
    skillRqid: string | undefined,
    actor: RqgActor,
  ): Promise<boolean> {
    if (!skillRqid) {
      return true; // No rqid (no linked skill) so count this as a success.
    }
    const embeddedSkill = actor.getBestEmbeddedDocumentByRqid(skillRqid);

    if (!embeddedSkill) {
      const skill = await Rqid.fromRqid(skillRqid);
      if (!skill) {
        logMisconfiguration(
          localize("RQG.Item.Notification.CantFindWeaponSkillWarning"),
          true,
          skillRqid,
        );
        return false;
      }
      await actor.createEmbeddedDocuments("Item", [skill as any]);
    }
    return true;
  }
}
