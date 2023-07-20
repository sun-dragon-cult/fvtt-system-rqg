import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

export async function renameLearnedToGainedChance(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  // @ts-expect-error learnedChance
  if (itemData.type === ItemTypeEnum.Skill && itemData?.learnedChance != null) {
    // @ts-expect-error learnedChance
    const learnedChance = itemData.system.learnedChance;

    updateData = {
      system: {
        gainedChance: Math.max(0, (learnedChance || 0) - itemData.system.baseChance),
        [`-=learnedChance`]: null,
      },
    };
  }
  return updateData;
}
