import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import type { ItemUpdate } from "../applyMigrations";
import { systemId } from "../../config";
import { getGame } from "../../util";

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
      name: deriveCultItemName(itemData.name, []),
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

// --- Importing didn't work so copying the code here instead ---

function deriveCultItemName(deity: string, cultNames: string[]): string {
  const joinedCultsFormatted = formatListByWorldLanguage(
    cultNames.filter(isTruthy).map((c) => c.trim())
  );

  if (!joinedCultsFormatted || joinedCultsFormatted === deity) {
    return deity.trim();
  }
  return joinedCultsFormatted + ` (${deity.trim()})`;
}

export type ListFormatType = "disjunction" | "conjunction" | "unit";

function formatListByWorldLanguage(
  list: string[],
  concatType: ListFormatType = "conjunction"
): string {
  const worldLanguage = (getGame().settings.get(systemId, "worldLanguage") as string) ?? "en";
  return formatListByLanguage(worldLanguage, list, concatType);
}

function formatListByLanguage(
  language: string,
  list: string[] | undefined,
  concatType: ListFormatType
): string {
  if (!list) {
    return "";
  }
  const listFormatter = new Intl.ListFormat(language, { style: "long", type: concatType });
  return listFormatter.format(list);
}

function isTruthy<T>(argument: T | undefined | null): argument is T {
  return !!argument;
}
