import { BaseItem } from "../baseItem";
import {
  HitLocationData,
  HitLocationsEnum,
} from "../../data-model/item-data/hitLocationData";

export class HitLocation extends BaseItem {
  // public static init() {
  //   Items.registerSheet("rqg", HitLocationSheet, {
  //     types: [ItemTypeEnum.HitLocation],
  //     makeDefault: true,
  //   });
  // }

  public static async prepareItemForActorSheet(item: Item<HitLocationData>) {
    console.log("*** HitLocation prepareItemForActorSheet", item);
    if (item.actor) {
      const newData = duplicate(item.data.data);

      // Remove any healed wounds
      newData.wounds = newData.wounds.filter((w) => w > 0);

      const totalHp = item.actor.data.data.attributes.hitPoints.max;
      newData.hp.max = HitLocation.hitPointsPerLocation(
        totalHp,
        item.data.name
      );
      newData.hp.value = newData.wounds.reduce(
        (acc: number, w: number) => acc - w,
        newData.hp.max
      );

      // Persist if changed
      if (JSON.stringify(newData) !== JSON.stringify(item.data.data)) {
        await item.update({ data: newData }, {});
      }
    }
    return item;
  }

  // TODO Humanoid centered as of yet
  private static hitPointsPerLocation(
    totalHitPoints: number,
    location: string
  ): number {
    const baseHp = Math.max(2, Math.ceil(totalHitPoints / 3));
    if (location === HitLocationsEnum.Chest) {
      return baseHp + 1;
    } else if (
      location === HitLocationsEnum.LeftArm ||
      location === HitLocationsEnum.RightArm
    ) {
      return baseHp - 1;
    } else {
      return baseHp;
    }
  }
}
