import { BaseItem } from "../baseItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationData,
  HitLocationsEnum,
} from "../../data-model/item-data/hitLocationData";

export class HitLocation extends BaseItem {
  entityName: string = ItemTypeEnum.Skill;

  public static async prepareItemForActorSheet(item: Item<HitLocationData>) {
    console.log("*** HitLocation prepareItemForActorSheet", item);
    if (item.actor) {
      // Remove any healed wounds
      item.data.data.wounds = item.data.data.wounds.filter((w) => w > 0);

      // TODO *** Does this not persist the wounds? ***
      await item.update(item.data, {
        "data.wounds": item.data.data.wounds,
      });

      const totalHp = item.actor.data.data.attributes.hitPoints.max;
      item.data.data.hp.max = HitLocation.hitPointsPerLocation(
        totalHp,
        item.data.name
      );
      item.data.data.hp.value = item.data.data.wounds.reduce(
        (acc: number, w: number) => acc - w,
        item.data.data.hp.max
      );
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
