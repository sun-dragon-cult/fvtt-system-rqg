import { RqgItem } from "../rqgItem";
import { assertDocumentSubType, localize } from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { SpiritMagicItem } from "@item-model/spiritMagicDataModel.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

/**
 * Check that the actor has enough magic points to cast the spell.
 * Return an error message if not allowed to cast.
 */
export function hasEnoughToCastSpell(
  levelUsed: number | undefined,
  boost: number | undefined,
  spellItem: RqgItem,
): string | undefined {
  assertDocumentSubType<SpiritMagicItem>(spellItem, ItemTypeEnum.SpiritMagic);
  if (levelUsed == null || levelUsed > spellItem.system.points) {
    return localize("RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel");
  } else if (
    boost == null ||
    levelUsed + boost >
      ((spellItem.actor as CharacterActor)?.system.attributes.magicPoints.value || 0)
  ) {
    return localize("RQG.Item.SpiritMagic.NotEnoughMagicPoints");
  } else {
    return;
  }
}
