import type { RqgActor } from "@actors/rqg-actor.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import { RuneMagicDataModel, type RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { assertDocumentSubType, localize } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import {
  type MagicPointSourceSelection,
  SELF_MAGIC_POINT_SOURCE,
  spendMagicPoints,
} from "../../system/magic-point-source";
import {
  type RunePointSourceSelection,
  SELF_RUNE_POINT_SOURCE,
  spendRunePoints,
} from "../../system/rune-point-source";

/**
 * `casterActor` defaults to `runeMagicItem`'s own owner (unchanged pre-#1002 behavior) - pass it
 * explicitly when the spell was cast via an external spell source (#1002, e.g. an Allied Spirit
 * bond partner's known spells), so Rune/Magic Points are drawn relative to the actual caster (not
 * the spell owner) and the cult used for Rune Point spending is the caster's own matching cult
 * (see RuneMagicDataModel.getCastingCult). `runeItem` is expected to already be the caster's own
 * Rune (see getEligibleRunes) - awardExperience() below flags whichever actor owns `runeItem`,
 * which falls out correctly for free as long as that's true.
 */
export async function handleRollResult(
  result: AbilitySuccessLevelEnum,
  runePointCost: number,
  magicPointsUsed: number,
  runeItem: RuneItem,
  runeMagicItem: RuneMagicItem,
  magicPointSource: MagicPointSourceSelection = SELF_MAGIC_POINT_SOURCE,
  runePointSource: RunePointSourceSelection = SELF_RUNE_POINT_SOURCE,
  casterActor: RqgActor | undefined = runeMagicItem.actor ?? undefined,
): Promise<void> {
  assertDocumentSubType<RuneItem>(runeItem, ItemTypeEnum.Rune);
  assertDocumentSubType<RuneMagicItem>(runeMagicItem, ItemTypeEnum.RuneMagic);
  assertDocumentSubType<CharacterActor>(casterActor, ActorTypeEnum.Character);
  const cult = runeMagicItem.system.getCastingCult(casterActor);
  assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);
  const isOneUse = runeMagicItem.system?.isOneUse;

  const costs = RuneMagicDataModel.calculatePointCosts(result, runePointCost, magicPointsUsed);

  await spendRuneAndMagicPoints(
    costs.rp,
    costs.mp,
    casterActor,
    cult,
    isOneUse,
    magicPointSource,
    runePointSource,
  );
  if (result <= AbilitySuccessLevelEnum.Success) {
    await runeItem.awardExperience();
  }

  if (costs.mp > 0 || costs.rp > 0) {
    ui.notifications?.info(
      localize("RQG.Item.RuneMagic.CastingCostInfo", {
        actorName: casterActor.name ?? "",
        runePointAmount: costs.rp.toString(),
        magicPointAmount: costs.mp.toString(),
      }),
    );
  }
}

async function spendRuneAndMagicPoints(
  runePoints: number,
  magicPoints: number,
  actor: RqgActor | undefined,
  cult: CultItem,
  isOneUse: boolean,
  magicPointSource: MagicPointSourceSelection,
  runePointSource: RunePointSourceSelection,
) {
  assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  // At this point if the current Rune Points or Magic Points are zero
  // it's too late. That validation happened earlier.
  // Rune Points and Magic Points are drawn from independent documents (the cult Item vs. the
  // caster's/ally's Magic Points) with no data dependency between them, so they can be
  // written concurrently rather than one awaited after the other - mirrors spendMagicPoints'
  // own use of Promise.all for the same reason.
  await Promise.all([
    spendRunePoints(actor, cult, runePoints, runePointSource, isOneUse),
    spendMagicPoints(actor, magicPoints, magicPointSource),
  ]);
}
