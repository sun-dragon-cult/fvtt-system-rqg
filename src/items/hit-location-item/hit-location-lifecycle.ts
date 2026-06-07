import type { RqgItem } from "@items/rqg-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { assertDocumentSubType, isDocumentSubType, localize, RqgError } from "../../system/util";
import type { ArmorItem } from "@item-model/armor-data-model.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";

function hitPointsPerLocation(totalHitPoints: number, baseHpDelta: number): number {
  return Math.max(2, Math.ceil(totalHitPoints / 3)) + (baseHpDelta || 0);
}

function updateHitLocationHitPoints(item: HitLocationItem, totalHp: number): void {
  item.system.hitPoints.max = hitPointsPerLocation(totalHp, item.system.baseHpDelta);
  item.system.hitPoints.value = item.system.wounds.reduce(
    (acc: number, wound: number) => acc - wound,
    item.system.hitPoints.max,
  );
}

export const hitLocationLifecycle = {
  handleActorPrepareEmbeddedDocuments(item: RqgItem): RqgItem {
    if (!isDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation)) {
      const msg = localize("RQG.Item.Notification.ItemWasNotHitLocationError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    assertDocumentSubType<CharacterActor>(
      actor,
      ActorTypeEnum.Character,
      "RQG.Item.Notification.HitLocationDoesNotHaveActorError",
    );

    // Add equipped armor absorptions for this hit location
    const armorAbsorption = actor.items.reduce((sum, armorItem) => {
      if (
        isDocumentSubType<ArmorItem>(armorItem, ItemTypeEnum.Armor) &&
        armorItem.system.equippedStatus === "equipped" &&
        armorItem.system.hitLocationRqidLinks.some(
          (l) => l.rqid === item.flags?.rqg?.documentRqidFlags?.id,
        )
      ) {
        sum += armorItem.system.absorbs;
      }
      return sum;
    }, 0);

    item.system.armorPoints = item.system.naturalAp + armorAbsorption;

    // Remove any healed wounds
    item.system.wounds = item.system.wounds.filter((w) => w > 0);

    return item;
  },

  handleActorPrepareDerivedData(item: RqgItem): RqgItem {
    if (!isDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation)) {
      const msg = localize("RQG.Item.Notification.ItemWasNotHitLocationError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }

    assertDocumentSubType<CharacterActor>(
      item.actor,
      ActorTypeEnum.Character,
      "RQG.Item.Notification.HitLocationDoesNotHaveActorError",
    );

    const totalHp = item.actor.system.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    updateHitLocationHitPoints(item, totalHp);

    return item;
  },
};
