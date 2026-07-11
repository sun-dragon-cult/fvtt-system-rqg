import type { RqgActor } from "@actors/rqg-actor.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import { RuneMagicDataModel, type RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { assertDocumentSubType, localize } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";

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
    CultItem | undefined;
  assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);
  const isOneUse = runeMagicItem.system?.isOneUse;

  const costs = RuneMagicDataModel.calculatePointCosts(result, runePointCost, magicPointsUsed);

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
