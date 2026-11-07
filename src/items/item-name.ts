import { ItemTypeEnum } from "@item-model/item-types.ts";
import { passionLabel } from "@item-model/passion-data-model.ts";
import { armorTypeLabel, materialLabel } from "@item-model/armor-data-model.ts";
import { formatListByWorldLanguage, localize } from "../system/util";

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** The two parts joined by the pattern, or the part that isn't empty. */
function combine(
  patternKey: string,
  [firstName, first]: [string, string],
  [secondName, second]: [string, string],
): string {
  if (!first || !second) {
    return first || second;
  }
  return localize(patternKey, { [firstName]: first, [secondName]: second });
}

/**
 * The name an item of this type gets from its system data, in the current language, e.g.
 * "Loyalty (Clan)". Empty when the data has nothing to name it by, or the type has no built name.
 */
export function buildItemName(type: string, system: Record<string, unknown>): string {
  switch (type) {
    case ItemTypeEnum.Rune: {
      const runeType = text(system["runeType"]);
      return combine(
        "RQG.Item.Rune.NamePattern",
        ["rune", text(system["rune"])],
        ["runeType", runeType ? localize(`RQG.Item.Rune.RuneType.${runeType}`) : ""],
      );
    }

    case ItemTypeEnum.Passion:
      return combine(
        "RQG.Item.Passion.NamePattern",
        ["passion", passionLabel(text(system["passion"]))],
        ["subject", text(system["subject"])],
      );

    case ItemTypeEnum.Armor: {
      const name = combine(
        "RQG.Item.Armor.NamePattern",
        ["armorType", armorTypeLabel(text(system["armorType"]))],
        ["material", materialLabel(text(system["material"]))],
      );
      return combine(
        "RQG.Item.Armor.NamePrefixPattern",
        ["prefix", text(system["namePrefix"])],
        ["name", name],
      );
    }

    case ItemTypeEnum.Skill:
      return combine(
        "RQG.Item.Skill.NamePattern",
        ["skill", text(system["skillName"])],
        ["specialization", text(system["specialization"])],
      );

    case ItemTypeEnum.Occupation:
      return combine(
        "RQG.Item.Occupation.NamePattern",
        ["occupation", text(system["occupation"])],
        ["specialization", text(system["specialization"])],
      );

    case ItemTypeEnum.Homeland:
      return combine(
        "RQG.Item.Homeland.NamePattern",
        ["homeland", text(system["homeland"])],
        ["region", text(system["region"])],
      );

    case ItemTypeEnum.Cult: {
      const deity = text(system["deity"]);
      const joinedCults = Array.isArray(system["joinedCults"]) ? system["joinedCults"] : [];
      const cults = formatListByWorldLanguage(
        joinedCults
          .map((c) => text((c as { cultName?: unknown } | null)?.cultName))
          .filter(Boolean),
      );
      return cults === deity
        ? deity
        : combine("RQG.Item.Cult.NamePattern", ["cults", cults], ["deity", deity]);
    }

    default:
      return "";
  }
}
