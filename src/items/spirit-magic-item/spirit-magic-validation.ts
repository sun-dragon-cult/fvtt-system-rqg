import { RqgItem } from "../rqg-item";
import { assertDocumentSubType, localize } from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";

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
