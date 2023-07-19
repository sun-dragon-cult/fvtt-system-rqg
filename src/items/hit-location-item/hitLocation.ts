import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { localize, RqgError } from "../../system/util";

export class HitLocation extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", HitLocationSheet, {
  //     types: [ItemTypeEnum.HitLocation],
  //     makeDefault: true,
  //   });
  // }

  public static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.type !== ItemTypeEnum.HitLocation) {
      const msg = localize("RQG.Item.Notification.ItemWasNotHitLocationError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    if (!actor) {
      const msg = localize("RQG.Item.Notification.HitLocationDoesNotHaveActorError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actorData = actor.system;

    // Add equipped armor absorptions for this hit location
    const armorAbsorption = actor.items.reduce((sum, armorItem) => {
      if (
        armorItem.type === ItemTypeEnum.Armor &&
        armorItem.system.equippedStatus === "equipped" &&
        armorItem.system.hitLocations.includes(item.name)
      ) {
        sum += armorItem.system.absorbs;
      }
      return sum;
    }, 0);

    item.system.armorPoints = item.system.naturalAp + armorAbsorption;

    // Calc HP
    const totalHp = actorData.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    // Remove any healed wounds
    // @ts-expect-error system
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
