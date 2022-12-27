import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { deleteKeyPrefix } from "../../util";

export async function renameLearnedToGainedChance(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  // @ts-ignore learnedChance
  if (itemData.type === ItemTypeEnum.Skill && itemData?.learnedChance != null) {
    // @ts-ignore learnedChance
    const learnedChance = itemData.system.learnedChance;

    updateData = {
      system: {
        gainedChance: Math.max(0, (learnedChance || 0) - itemData.system.baseChance),
        [`${deleteKeyPrefix}learnedChance`]: null,
      },
    };
  }
  return updateData;
}
