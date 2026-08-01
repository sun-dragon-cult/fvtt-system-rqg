import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { assertDocumentSubType, isDocumentSubType } from "../../system/util";
import { toRqidString } from "../../system/api/rqid-validation";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import { CharacterDataModel } from "../../data-model/actor-data/character-data-model";
import { systemId } from "../../system/config";

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

/**
 * Finds the rune opposing `rune`, regardless of which side declares the
 * `opposingRuneRqidLink` — either `rune` links to it, or it links to `rune`.
 * This keeps auto-balancing symmetric: it doesn't matter which of the pair you edit.
 */
function findOpposingRune(actor: RqgActor, rune: RuneItem): RqgItem | undefined {
  const linkedRqid = toRqidString(rune.system.opposingRuneRqidLink?.rqid);
  if (linkedRqid) {
    const direct = actor.getBestEmbeddedDocumentByRqid(linkedRqid);
    if (direct) {
      return direct;
    }
  }

  const ownRqid = rune.getFlag(systemId, "documentRqidFlags")?.id;
  if (!ownRqid) {
    return undefined;
  }
  return (actor.items as unknown as RqgItem[]).find(
    (candidate) =>
      candidate.id !== rune.id &&
      isDocumentSubType<RuneItem>(candidate, ItemTypeEnum.Rune) &&
      toRqidString(candidate.system.opposingRuneRqidLink?.rqid) === ownRqid,
  );
}

export const runeLifecycle = {
  handleItemUpdateDocumentsPreUpdate(
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
      // Illuminated characters gain "Embrace Runic Opposites": their opposed runes no
      // longer need to sum to 100%, so skip the auto-balancing entirely for them.
      if (
        isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character) &&
        CharacterDataModel.isIlluminated(actor)
      ) {
        return;
      }
      const opposingRune = findOpposingRune(actor, rune);
      const chance = chanceResult["system.chance"] ?? chanceResult.system.chance;
      if (opposingRune && chance != null) {
        // While editing a rune it's possible to have incomplete data, ignore in that case.
        adjustOpposingRuneChance(opposingRune, chance, updates);
      }
    }
  },
};
