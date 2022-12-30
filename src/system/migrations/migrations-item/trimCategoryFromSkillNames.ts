import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

export async function trimCategoryFromSkillNames(itemData: ItemData): Promise<ItemUpdate> {
  const updateData: ItemUpdate = {};
  if (itemData.type === ItemTypeEnum.Skill) {
    // Trim the "- category" if on the skill
    var dashPosition = itemData.name.indexOf(" - ");
    if (dashPosition > -1) {
      var testCategoryStr = itemData.name.substring(dashPosition);
      if (categorySuffixes.indexOf(testCategoryStr) > -1) {
        updateData.name = itemData.name.substring(0, dashPosition);
      }
    }
  }

  return updateData;
}

const categorySuffixes = [
  " - agility",
  " - communication",
  " - knowledge",
  " - magic",
  " - manipulation",
  " - meleeWeapons",
  " - missileWeapons",
  " - otherSkills",
  " - naturalWeapons",
  " - perception",
  " - shields",
  " - stealth",
];
