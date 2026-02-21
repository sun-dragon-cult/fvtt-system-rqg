import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { assertDocumentSubType, isDocumentSubType, localize, RqgError } from "../../system/util";
import type { ArmorItem } from "@item-model/armorData.ts";
import type { HitLocationItem } from "@item-model/hitLocationData.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export class HitLocation extends AbstractEmbeddedItem {
  public static override onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
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
    const actorData = actor.system;

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

    // Calc HP
    const totalHp = actorData.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    // Remove any healed wounds
    item.system.wounds = item.system.wounds.filter((w) => w > 0);

    item.system.hitPoints.max = HitLocation.hitPointsPerLocation(totalHp, item.system.baseHpDelta);
    item.system.hitPoints.value = item.system.wounds.reduce(
      (acc: number, w: number) => acc - w,
      item.system.hitPoints.max,
    );

    return item;
  }

  private static hitPointsPerLocation(totalHitPoints: number, baseHpDelta: number): number {
    return Math.max(2, Math.ceil(totalHitPoints / 3)) + (baseHpDelta || 0);
  }
}
