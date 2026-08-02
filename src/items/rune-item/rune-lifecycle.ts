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
 * Finds the rune reciprocally opposing `rune` — both sides must declare the
 * `opposingRuneRqidLink` to each other, matching the `linked` state that decides whether
 * the rune tab shows a connecting line. A cleared or one-sided link means the pair is
 * independent for auto-balancing too, not just for display — otherwise clearing the link
 * on one rune would visually disconnect the pair while the other rune's still-declared
 * link kept silently forcing it back into sync.
 */
function findOpposingRune(actor: RqgActor, rune: RuneItem): RqgItem | undefined {
  const linkedRqid = toRqidString(rune.system.opposingRuneRqidLink?.rqid);
  if (!linkedRqid) {
    return undefined;
  }

  const ownRqid = rune.getFlag(systemId, "documentRqidFlags")?.id;
  if (!ownRqid) {
    return undefined;
  }

  const candidate = actor.getBestEmbeddedDocumentByRqid(linkedRqid);
  if (
    !candidate ||
    !isDocumentSubType<RuneItem>(candidate, ItemTypeEnum.Rune) ||
    toRqidString(candidate.system.opposingRuneRqidLink?.rqid) !== ownRqid
  ) {
    return undefined;
  }

  return candidate;
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
      // Actors with "Embrace Runic Opposites" have opposed runes that no longer need to
      // sum to 100%, so skip the auto-balancing entirely for them.
      if (
        isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character) &&
        CharacterDataModel.hasEmbraceRunicOpposites(actor)
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
