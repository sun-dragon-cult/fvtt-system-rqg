import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { ItemUpdate } from "../applyMigrations";
import { isDocumentType } from "../../util.ts";

// Give the "special" skills a rqid, so they can be referenced by rqid instead of name.
export async function tagSkillNameSkillsWithRqid(itemData: Item.Stored): Promise<ItemUpdate> {
  let updateData = {};
  if (
    isDocumentType(itemData.type, ItemTypeEnum.Skill) &&
    [...name2Rqid.keys()].includes(itemData.name)
  ) {
    updateData = {
      flags: {
        rqg: {
          documentRqidFlags: {
            id: itemData?.flags?.rqg?.documentRqidFlags?.id || name2Rqid.get(itemData.name),
            lang: itemData?.flags?.rqg?.documentRqidFlags?.lang || CONFIG.RQG.fallbackLanguage,
            priority: itemData?.flags?.rqg?.documentRqidFlags?.priority || 0,
          },
        },
      },
    };
  }
  return updateData;
}

// Need to include both name versions since `trimCategoryFromSkillNames` possibly hasn't
// taken effect yet (being in the same pending update)
const name2Rqid = new Map([
  ["Dodge", "i.skill.dodge"],
  ["Jump", "i.skill.jump"],
  ["Move Quietly", "i.skill.move-quietly"],
  ["Spirit Combat", "i.skill.spirit-combat"],

  ["Dodge - agility", "i.skill.dodge"],
  ["Jump - agility", "i.skill.jump"],
  ["Move Quietly - stealth", "i.skill.move-quietly"],
  ["Spirit Combat - magic", "i.skill.spirit-combat"],

  // Spanish names
  ["Esquivar", "i.skill.dodge"],
  ["Saltar", "i.skill.jump"],
  ["Deslizarse en silencio", "i.skill.move-quietly"],
  ["Combate espiritual", "i.skill.spirit-combat"],

  ["Esquivar - agility", "i.skill.dodge"],
  ["Saltar - agility", "i.skill.jump"],
  ["Deslizarse en silencio - stealth", "i.skill.move-quietly"],
  ["Combate espiritual - magic", "i.skill.spirit-combat"],
]);
