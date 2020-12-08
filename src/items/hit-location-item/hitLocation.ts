import { BaseItem } from "../baseItem";
import { HitLocationData, HitLocationsEnum } from "../../data-model/item-data/hitLocationData";
import { RqgItem } from "../rqgItem";

export class HitLocation extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", HitLocationSheet, {
  //     types: [ItemTypeEnum.HitLocation],
  //     makeDefault: true,
  //   });
  // }

  public static prepareAsEmbeddedItem(item: RqgItem<HitLocationData>): RqgItem {
    console.debug("*** HitLocation prepareAsEmbeddedItem", item);
    // Remove any healed wounds
    item.data.data.wounds = item.data.data.wounds.filter((w) => w > 0);

    const totalHp = item.actor.data.data.attributes.hitPoints.max;
    item.data.data.hp.max = HitLocation.hitPointsPerLocation(totalHp, item.data.name);
    item.data.data.hp.value = item.data.data.wounds.reduce(
      (acc: number, w: number) => acc - w,
      item.data.data.hp.max
    );

    item.data.data.ap = item.data.data.naturalAp; // Init AP with natural AP before active effects
    return item;
  }

  // TODO Humanoid centered as of yet
  private static hitPointsPerLocation(totalHitPoints: number, location: string): number {
    const baseHp = Math.max(2, Math.ceil(totalHitPoints / 3));
    if (location === HitLocationsEnum.Chest) {
      return baseHp + 1;
    } else if (location === HitLocationsEnum.LeftArm || location === HitLocationsEnum.RightArm) {
      return baseHp - 1;
    } else {
      return baseHp;
    }
  }
}
