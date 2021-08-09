import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { RqgActor } from "../rqgActor";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgError } from "../../system/util";

export class HitLocation extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", HitLocationSheet, {
  //     types: [ItemTypeEnum.HitLocation],
  //     makeDefault: true,
  //   });
  // }

  public static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.data.type !== ItemTypeEnum.HitLocation) {
      const msg =
        "Called hitLocation#onActorPrepareEmbeddedEntities on an item that wasn't a hitLocation";
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor as RqgActor;
    const actorData = actor.data.data;

    // Add equipped armor absorptions for this hit location
    const armorAbsorption = actor.items.reduce((sum, armorItem) => {
      if (
        armorItem.data.type === ItemTypeEnum.Armor &&
        armorItem.data.data.equippedStatus === "equipped" &&
        armorItem.data.data.hitLocations.includes(item.data.name)
      ) {
        sum += armorItem.data.data.absorbs;
      }
      return sum;
    }, 0);

    item.data.data.ap = item.data.data.naturalAp + armorAbsorption;

    // Calc HP
    const totalHp = actorData.attributes.hitPoints.max;
    if (totalHp == null) {
      const msg = "Actor doesn't have max hitPoints";
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }
    // Remove any healed wounds
    item.data.data.wounds = item.data.data.wounds.filter((w) => w > 0);

    item.data.data.hp.max = HitLocation.hitPointsPerLocation(totalHp, item.data.data.baseHpDelta);
    item.data.data.hp.value = item.data.data.wounds.reduce(
      (acc: number, w: number) => acc - w,
      item.data.data.hp.max
    );

    return item;
  }

  private static hitPointsPerLocation(totalHitPoints: number, baseHpDelta: number): number {
    return Math.max(2, Math.ceil(totalHitPoints / 3)) + (baseHpDelta || 0);
  }
}
