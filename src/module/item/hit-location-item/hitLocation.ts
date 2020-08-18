import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { BaseItem } from "../baseItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationData,
  HitLocationsEnum,
} from "../../data-model/item-data/hitLocationData";

export class HitLocation extends BaseItem {
  entityName: string = ItemTypeEnum.Skill;

  public static async prepareItemForActorSheet(
    item: Item<HitLocationData>,
    actor: Actor<RqgActorData>
  ) {
    console.log(
      "*** Skill prepareItemForActorSheet data",
      item,
      " actor",
      actor
    );
    if (actor) {
      const totalHp = actor.data.data.attributes.hitPoints.max;
      item.data.data.hp.max = this.hitPointsPerLocation(
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
