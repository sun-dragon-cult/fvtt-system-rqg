import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

export async function moveRuneIcons(itemData: ItemData): Promise<ItemUpdate> {
  const runeIconFileNameMatch = itemData.img
    ?.matchAll(
      /(?:systems\/rqg\/assets\/runes\/|modules.*-rqg\/assets\/images\/runes\/|modules\/rqg-core\/assets\/runes\/)(.*)/g,
    )
    .next();
  const fileName =
    !runeIconFileNameMatch || runeIconFileNameMatch.done
      ? undefined
      : (runeIconFileNameMatch!.value[1] as string);

  if (fileName) {
    return {
      img: `systems/rqg/assets/images/runes/${fileName}`,
    };
  }
  return {};
}
