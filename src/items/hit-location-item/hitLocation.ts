import { BaseItem } from "../baseItem";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgError } from "../../system/util";

export class HitLocation extends BaseItem {
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

    item.data.data.ap = item.data.data.naturalAp; // Init AP with natural AP before active effects

    return item;
  }

  private static hitPointsPerLocation(totalHitPoints: number, baseHpDelta: number): number {
    return Math.max(2, Math.ceil(totalHitPoints / 3)) + (baseHpDelta || 0);
  }
}
