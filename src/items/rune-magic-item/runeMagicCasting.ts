import type { RqgActor } from "@actors/rqgActor.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { CultItem } from "@item-model/cultDataModel.ts";
import type { RuneItem } from "@item-model/runeDataModel.ts";
import type { RuneMagicItem } from "@item-model/runeMagicDataModel.ts";
import type { RqidLink } from "../../data-model/shared/rqidLink";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import { toRqidString } from "../../system/api/rqidValidation";
import { assertDocumentSubType, isTruthy, localize, RqgError } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData";

type RpAndMpCost = { mp: number; rp: number; exp: boolean };

/**
 * Check that the actor has enough magic and rune points to cast the spell.
 * Return an error message if not allowed to cast.
 */
export function hasEnoughToCastSpell(
  cultItem: CultItem,
  runePointCost: number | undefined,
  magicPointsBoost: number = 0,
): string | undefined {
  assertDocumentSubType<CultItem>(cultItem, ItemTypeEnum.Cult);
  if (runePointCost == null || runePointCost > (Number(cultItem.system.runePoints.value) || 0)) {
    return game.i18n?.format("RQG.Item.RuneMagic.validationNotEnoughRunePoints");
  } else if (
    magicPointsBoost >
    (Number((cultItem.actor as CharacterActor)?.system.attributes?.magicPoints?.value) || 0)
  ) {
    return localize("RQG.Item.RuneMagic.RuneMagic.validationNotEnoughMagicPoints");
  } else {
    return undefined;
  }
}

/**
 * Given a rune spell and an actor, returns the runes that are possible to use for casting that spell.
 */
export function getEligibleRunes(runeMagicItem: RuneMagicItem): RuneItem[] {
  assertDocumentSubType<RuneMagicItem>(runeMagicItem, ItemTypeEnum.RuneMagic);

  // The cult from where the spell was learned
  const cult = runeMagicItem.actor?.items.get(runeMagicItem.system.cultId) as CultItem | undefined;
  assertDocumentSubType<CultItem>(
    cult,
    ItemTypeEnum.Cult,
    "RQG.Item.RuneMagic.validationNoCultAssigned",
  );

  let usableRuneRqids: string[];
  const runeMagicRuneRqids = [
    ...new Set(runeMagicItem.system.runeRqidLinks.map((r: RqidLink) => r.rqid).filter(isTruthy)),
  ] as string[];
  if (runeMagicRuneRqids.includes(CONFIG.RQG.runeRqid.magic)) {
    // Actor can use any of the cult's runes to cast
    // And some cults have the same rune more than once, so de-dupe them
    usableRuneRqids = [...new Set(cult.system.runeRqidLinks.map((r: RqidLink) => r.rqid))].filter(
      isTruthy,
    ) as string[];
  } else {
    // Actor can use any of the Rune Magic Spell's runes to cast
    usableRuneRqids = runeMagicRuneRqids;
  }
  // Get the actor's versions of the runes, which will have their "chance"
  const runesForCasting = usableRuneRqids
    .map(
      (runeRqid) =>
        runeMagicItem.actor?.getBestEmbeddedDocumentByRqid(toRqidString(runeRqid)) as RuneItem,
    )
    .filter(isTruthy);

  return runesForCasting;
}

export function getStrongestRune(runeItems: RuneItem[]): RuneItem | undefined {
  if (runeItems.length === 0) {
    return undefined;
  }
  return runeItems.reduce((strongest, current) => {
    const strongestRuneChance = strongest.system.chance ?? 0;
    const currentRuneChance = current.system.chance ?? 0;
    return strongestRuneChance > currentRuneChance ? strongest : current;
  });
}

export async function handleRollResult(
  result: AbilitySuccessLevelEnum,
  runePointCost: number,
  magicPointsUsed: number,
  runeItem: RuneItem,
  runeMagicItem: RuneMagicItem,
): Promise<void> {
  assertDocumentSubType<RuneItem>(runeItem, ItemTypeEnum.Rune);
  assertDocumentSubType<RuneMagicItem>(runeMagicItem, ItemTypeEnum.RuneMagic);
  const cult = runeMagicItem.actor?.items.get(runeMagicItem.system.cultId ?? "") as
    | CultItem
    | undefined;
  assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);
  const isOneUse = runeMagicItem.system?.isOneUse;

  const costs = calcRuneAndMagicPointCost(result, runePointCost, magicPointsUsed);

  await spendRuneAndMagicPoints(
    costs.rp,
    costs.mp,
    runeMagicItem.actor ?? undefined,
    cult,
    isOneUse,
  );
  if (result <= AbilitySuccessLevelEnum.Success) {
    await runeItem.awardExperience();
  }

  if (costs.mp > 0 || costs.rp > 0) {
    ui.notifications?.info(
      localize("RQG.Item.RuneMagic.CastingCostInfo", {
        actorName: runeMagicItem.parent?.name ?? "",
        runePointAmount: costs.rp.toString(),
        magicPointAmount: costs.mp.toString(),
      }),
    );
  }
}

export function calcRuneAndMagicPointCost(
  result: AbilitySuccessLevelEnum,
  runePointCost: number,
  magicPointsUsed: number,
): RpAndMpCost {
  switch (result) {
    case AbilitySuccessLevelEnum.Critical:
      // spell takes effect, Rune Points NOT spent, Rune gets xp check, boosting Magic Points spent
      return {
        mp: magicPointsUsed,
        rp: 0,
        exp: true,
      };

    case AbilitySuccessLevelEnum.Success:
    case AbilitySuccessLevelEnum.Special:
      // spell takes effect, Rune Points spent, Rune gets xp check, boosting Magic Points spent
      return {
        mp: magicPointsUsed,
        rp: runePointCost,
        exp: true,
      };

    case AbilitySuccessLevelEnum.Failure: {
      // spell fails, no Rune Point Loss, if Magic Point boosted, lose 1 Magic Point if boosted
      const boosted = magicPointsUsed >= 1 ? 1 : 0;
      return {
        mp: boosted,
        rp: 0,
        exp: false,
      };
    }

    case AbilitySuccessLevelEnum.Fumble: {
      // spell fails, lose Rune Points, if Magic Point boosted, lose 1 Magic Point if boosted
      const boosted = magicPointsUsed >= 1 ? 1 : 0;
      return {
        mp: boosted,
        rp: runePointCost,
        exp: false,
      };
    }

    default: {
      const msg = "Got unexpected result from roll in runeMagicChat";
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
  }
}

async function spendRuneAndMagicPoints(
  runePoints: number,
  magicPoints: number,
  actor: RqgActor | undefined,
  cult: CultItem,
  isOneUse: boolean,
) {
  assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  // At this point if the current Rune Points or Magic Points are zero
  // it's too late. That validation happened earlier.
  const newRunePointTotal = (cult.system.runePoints.value || 0) - runePoints;
  const newMagicPointTotal = (actor?.system.attributes.magicPoints.value || 0) - magicPoints;
  let newRunePointMaxTotal = cult.system.runePoints.max || 0;
  if (isOneUse) {
    newRunePointMaxTotal -= runePoints;
    if (newRunePointMaxTotal < (cult.system.runePoints.max || 0)) {
      ui.notifications?.info(
        localize("RQG.Item.RuneMagic.SpentOneUseRunePoints", {
          actorName: actor?.name,
          runePoints: runePoints.toString(),
          cultName: cult.name,
        }),
      );
    }
  }
  const updateCultItemRunePoints: Item.UpdateData = {
    _id: cult?.id,
    system: { runePoints: { value: newRunePointTotal, max: newRunePointMaxTotal } },
  } as any; // runePoints is a cult-specific field not in the base Item update type
  await actor?.updateEmbeddedDocuments("Item", [updateCultItemRunePoints]);
  const updateActorMagicPoints = {
    system: { attributes: { magicPoints: { value: newMagicPointTotal } } },
  };
  await actor?.update(updateActorMagicPoints);
}
