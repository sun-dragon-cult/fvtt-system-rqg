import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

export async function renameDragonewt(itemData: ItemData): Promise<ItemUpdate> {
  const updateData: any = {};

  if (itemData.img === "systems/rqg/assets/images/runes/dragonnewt.svg") {
    updateData.img = "systems/rqg/assets/images/runes/dragonewt.svg";
  }
  if (itemData.name === "Dragonnewt (form)") {
    updateData.name = "Dragonewt (form)";
    updateData.data = { rune: "Dragonewt" };
  }

  return updateData;
}
