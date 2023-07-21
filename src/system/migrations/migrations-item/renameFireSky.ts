import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { systemProp } from "../../util";

export async function renameFireSky(itemData: ItemData): Promise<ItemUpdate> {
  let updateData: ItemUpdate = {};

  // Rename the Fire rune item itself
  if (itemData.name === "Fire (element)") {
    updateData = {
      name: "Fire/Sky (element)",
      data: { rune: "Fire/Sky" },
      flags: { rqg: { documentRqidFlags: { id: "i.rune.fire-sky-element" } } },
    };
  }

  // Rename Rune item references to the Fire rune
  // A Rune can not have itself as a minor rune so there is no risk of overwriting updateData above
  const minorRunes = (itemData as any)[systemProp()]?.minorRunes;
  if (minorRunes?.includes("Fire (element)")) {
    updateData = {
      data: {
        minorRunes: minorRunes.map((r: string) =>
          r === "Fire (element)" ? "Fire/Sky (element)" : r,
        ),
      },
    };
  }

  // Cult, RuneMagic & Skill items have "runes" property that might point to Fire Rune
  const runes = (itemData as any)[systemProp()]?.runes;
  if (runes?.includes("Fire (element)")) {
    updateData = {
      data: {
        runes: runes.map((r: string) => (r === "Fire (element)" ? "Fire/Sky (element)" : r)),
      },
    };
  }

  return updateData;
}
