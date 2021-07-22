import { RqgItem } from "../rqgItem";
import { CultItemData } from "../../data-model/item-data/cultData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export function calcRuneMagicChance(
  actorItems: Collection<RqgItem>,
  cultId: string,
  runeMagicRuneNames: string[]
): number {
  const cultRunes = (
    cultId ? (actorItems.get(cultId) as Item<CultItemData>).data.data.runes : []
  ) as string[];
  const runeChances = actorItems
    .filter(
      (i: RqgItem) =>
        i.data.type === ItemTypeEnum.Rune &&
        (runeMagicRuneNames.includes(i.name) ||
          (runeMagicRuneNames.includes("Magic (condition)") && cultRunes.includes(i.name)))
    )
    // @ts-ignore r is a runeItem
    .map((r: RqgItem) => r.data.data.chance);
  return Math.max(...runeChances);
}
