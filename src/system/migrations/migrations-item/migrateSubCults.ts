import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { CultSheet } from "../../../items/cult-item/cultSheet";

// Migrate Cults to use the joinedCult (subcult) array
export async function migrateSubCults(itemData: ItemData): Promise<ItemUpdate> {
  let updateData = {};
  // Use rank to check if migration is done
  if (itemData.type === ItemTypeEnum.Cult && (itemData.system as any).rank) {
    const newJoinedCult = {
      cultName: itemData.name,
      tagline: (itemData.system as any).tagline,
      rank: (itemData.system as any).rank,
    };

    if ((itemData.system as any)?.subCults) {
      console.warn(
        `Item ${itemData.name} had subCult data ${(itemData.system as any).subCults}`,
        itemData
      );
    }

    updateData = {
      name: CultSheet.deriveItemName(itemData.name, []),
      system: {
        [`-=tagline`]: null,
        [`-=rank`]: null,
        [`-=subCults`]: null,
        deity: itemData.name,
        joinedCults: [newJoinedCult],
      },
    };
  }
  return updateData;
}
