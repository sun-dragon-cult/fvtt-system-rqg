import { BaseItem } from "../baseItem";
import { HitLocationData } from "../../data-model/item-data/hitLocationData";
import { RqgItem } from "../rqgItem";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";

export class HitLocation extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", HitLocationSheet, {
  //     types: [ItemTypeEnum.HitLocation],
  //     makeDefault: true,
  //   });
  // }

  public static onActorPrepareEmbeddedEntities(item: RqgItem<HitLocationData>): RqgItem {
    const actorData = item.actor.data.data as RqgActorData;
    // Remove any healed wounds
    item.data.data.wounds = item.data.data.wounds.filter((w) => w > 0);

    const totalHp = actorData.attributes.hitPoints.max;
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
