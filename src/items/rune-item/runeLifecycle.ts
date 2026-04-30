import type { RqgActor } from "@actors/rqgActor.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { assertDocumentSubType, isDocumentSubType } from "../../system/util";
import { toRqidString } from "../../system/api/rqidValidation";
import type { RuneItem } from "@item-model/runeDataModel.ts";

function adjustOpposingRuneChance(
  opposingRune: RqgItem | undefined,
  newChance: number,
  updates: object[],
): void {
  if (!opposingRune) {
    return;
  }
  assertDocumentSubType<RuneItem>(opposingRune, ItemTypeEnum.Rune);
  const opposingRuneChance = opposingRune.system.chance;
  if (newChance + opposingRuneChance !== 100) {
    updates.push({
      _id: opposingRune.id,
      system: { chance: 100 - newChance },
    });
  }
}

export const runeLifecycle = {
  preUpdateItem(
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
          toRqidString(rune.system.opposingRuneRqidLink.rqid),
        );
        const chance = chanceResult["system.chance"] ?? chanceResult.system.chance;
        if (opposingRune && chance != null) {
          // While editing a rune it's possible to have incomplete data, ignore in that case.
          adjustOpposingRuneChance(opposingRune, chance, updates);
        }
      }
    }
  },
};
