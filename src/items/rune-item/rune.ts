import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { assertDocumentSubType, isDocumentSubType } from "../../system/util";
import type { RuneItem } from "@item-model/runeData.ts";

export class Rune extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneSheet, {
  //     types: [ItemTypeEnum.ElementalRune],
  //     makeDefault: true,
  //   });
  // }

  static override preUpdateItem(
    actor: RqgActor,
    rune: RqgItem,
    updates: any[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
  ): void {
    if (isDocumentSubType<RuneItem>(rune, ItemTypeEnum.Rune)) {
      const chanceResult = updates.find(
        (r) => r["system.chance"] != null || r?.system?.chance != null,
      );
      if (!chanceResult) {
        return;
      }
      if (rune.system.opposingRuneRqidLink?.rqid) {
        const opposingRune = actor.getBestEmbeddedDocumentByRqid(
          rune.system.opposingRuneRqidLink.rqid,
        );
        const chance = chanceResult["system.chance"] || chanceResult.system.chance;
        if (opposingRune && chance) {
          // While editing a rune it's possible to have incomplete data, ignore in that case.
          this.adjustOpposingRuneChance(opposingRune, chance, updates);
        }
      }
    }
  }

  private static adjustOpposingRuneChance(
    opposingRune: RqgItem | undefined,
    newChance: number,
    updates: object[],
  ) {
    assertDocumentSubType<RuneItem>(opposingRune, ItemTypeEnum.Rune);
    const opposingRuneChance = opposingRune.system.chance;
    if (newChance + opposingRuneChance !== 100) {
      updates.push({
        _id: opposingRune.id,
        system: { chance: 100 - newChance },
      });
    }
  }
}
