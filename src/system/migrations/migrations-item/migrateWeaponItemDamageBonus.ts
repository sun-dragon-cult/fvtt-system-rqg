import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { assertItemType } from "../../util";
import { UsageType } from "../../../data-model/item-data/weaponData";

// Same as in weapon.ts
const damageBonusRegex = /\+[^+\-*/]*db(?<half>[^+\-*/]*\/[^+\-*/]*2)?/;

export async function migrateWeaponItemDamageBonus(itemData: ItemData): Promise<ItemUpdate> {
  const updateData: any = {};

  if (itemData.type === ItemTypeEnum.Weapon) {
    assertItemType(itemData?.type, ItemTypeEnum.Weapon);

    Object.entries(itemData.system.usage).forEach(([usageType, usage]) => {
      if (usage.skillRqidLink && usage.damage && !hasDbInDamage(usage.damage)) {
        const update = {
          system: {
            usage: {
              [usageType]: {
                damage:
                  (itemData.system.usage[usageType as UsageType].damage ?? "") +
                  getWeaponDbString(itemData, usageType as UsageType),
              },
            },
          },
        };
        mergeObject(updateData, update);
      }
    });
  }

  return updateData;
}

function hasDbInDamage(damage: string): boolean {
  return damageBonusRegex.test(damage);
}

function getWeaponDbString(itemData: ItemData, usageType: UsageType): string {
  assertItemType(itemData?.type, ItemTypeEnum.Weapon);

  if (usageType === "oneHand" || usageType === "offHand" || usageType === "twoHand") {
    return "+db";
  }
  if (usageType === "missile") {
    if (itemData.system.isThrownWeapon) {
      return "+db/2";
    }
    return ""; // Projectile Weapons & Ranged weapons don't have db
  }

  console.error("Unexpected usageType", usageType, itemData); // Should never happen
  return "";
}
