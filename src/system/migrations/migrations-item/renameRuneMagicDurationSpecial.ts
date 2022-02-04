import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { SpellDurationEnum } from "../../../data-model/item-data/spell";

export async function renameRuneMagicDurationSpecial(itemData: ItemData): Promise<ItemUpdate> {
  if (itemData.type === ItemTypeEnum.RuneMagic && (itemData.data.duration as any) === "duration") {
    return {
      data: {
        duration: SpellDurationEnum.Special,
      },
    };
  }
  return {};
}
