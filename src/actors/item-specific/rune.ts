import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgError } from "../../system/util";

export class Rune extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneSheet, {
  //     types: [ItemTypeEnum.ElementalRune],
  //     makeDefault: true,
  //   });
  // }
  static preUpdateItem(actor: RqgActor, rune: RqgItem, updates: object[], options: any): void {
    if (rune.data.type === ItemTypeEnum.Rune) {
      // @ts-ignore 0.8
      const chanceResult = updates.find((r) => r["data.chance"] != null);
      if (!chanceResult) {
        return;
      }
      if (rune.data.data.opposingRune) {
        const opposingRune = actor.items.getName(rune.data.data.opposingRune);
        // @ts-ignore 0.8
        this.adjustOpposingRuneChance(
          opposingRune,
          rune,
          actor,
          // @ts-ignore 0.8
          chanceResult["data.chance"],
          updates
        );
      }
    }
  }

  private static adjustOpposingRuneChance(
    opposingRune: RqgItem | null,
    item: RqgItem,
    actor: RqgActor,
    newChance: number,
    updates: object[]
  ) {
    if (!opposingRune || opposingRune.data.type !== ItemTypeEnum.Rune) {
      const msg = "Opposing Rune doesn't exist";
      ui.notifications?.error(msg);
      throw new RqgError(msg, item, actor);
    }
    const opposingRuneChance = opposingRune.data.data.chance;
    if (newChance + opposingRuneChance !== 100) {
      updates.push({
        _id: opposingRune.id,
        data: { chance: 100 - newChance },
      });
    }
  }
}
