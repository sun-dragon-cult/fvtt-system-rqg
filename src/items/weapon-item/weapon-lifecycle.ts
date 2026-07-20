import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { assertDocumentSubType, isDocumentSubType, mergeArraysById } from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { getLocationRelatedUpdates } from "../shared/physical-item-util";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import { embedLinkedSkill } from "./weapon-skill-links";

/**
 * If a projectile (e.g. an arrow) that is linked to a weapon (e.g. a bow) via projectileId
 * is unequipped, remove that link so the weapon doesn't keep consuming the unequipped projectile.
 */
function getUnequippedProjectileLinkUpdates(
  actorEmbeddedItems: RqgActor["items"]["contents"],
  physicalItem: RqgItem,
  updates: object[],
): any[] {
  const equippedStatusUpdate: any = updates.find((u: any) => u._id === physicalItem.id);
  // Updates can use either the flattened dot-notation key (from form submissions) or a
  // nested `system: { equippedStatus }` object (e.g. from updateEmbeddedDocuments calls).
  const newEquippedStatus =
    equippedStatusUpdate?.["system.equippedStatus"] ?? equippedStatusUpdate?.system?.equippedStatus;
  if (!newEquippedStatus || newEquippedStatus === "equipped") {
    return [];
  }

  return actorEmbeddedItems
    .filter(
      (i) =>
        isDocumentSubType<WeaponItem>(i, ItemTypeEnum.Weapon) &&
        i.system.projectileId === physicalItem.id,
    )
    .map((i) => ({ _id: i.id, "system.projectileId": "" }));
}

export const weaponLifecycle = {
  handleItemUpdateDocumentsPreUpdate(
    actor: RqgActor,
    weapon: RqgItem,
    updates: object[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
  ): void {
    if (isDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon)) {
      mergeArraysById(updates, getLocationRelatedUpdates(actor.items.contents, weapon, updates));
      mergeArraysById(
        updates,
        getUnequippedProjectileLinkUpdates(actor.items.contents, weapon, updates),
      );
    }
  },

  /*
   * Add the skills specified in the weapon to the actor (if not already there)
   * and connect the weapons with the embedded item skill id.
   */
  async handleActorOnCreateDescendantDocuments(
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
      embedLinkedSkill(child.system.usage.oneHand.skillRqidLink?.rqid, actor),
      embedLinkedSkill(child.system.usage.offHand.skillRqidLink?.rqid, actor),
      embedLinkedSkill(child.system.usage.twoHand.skillRqidLink?.rqid, actor),
      embedLinkedSkill(child.system.usage.missile.skillRqidLink?.rqid, actor),
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
  },
};
