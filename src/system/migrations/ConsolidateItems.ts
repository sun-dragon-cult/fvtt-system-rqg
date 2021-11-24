import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, getGame, hasOwnProperty } from "../util";
import { RqgItem } from "../../items/rqgItem";
import { applyMigrations, ItemUpdate } from "./applyMigrations";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";

const compendiumCultHolyDays = new Map<string, CompendiumCultData>(); // key is cult name
const compendiumWeaponSkills = new Map<string, CompendiumWeaponSkillData>(); // key is skill name
const compendiumJournals = new Map<string, CompendiumJournalData>(); // key is "<itemType>.<itemName>"

let unusedCompendiumJournals: Map<string, CompendiumJournalData>;
let unchangedJournalLinks: Set<string> = new Set();

let unusedCompendiumWeaponSkills = new Map<string, CompendiumWeaponSkillData>();
let unchangedWeaponSkills: Set<string> = new Set();

let unusedCompendiumCultHolyDays = new Map<string, CompendiumCultData>();
let unchangedCultHolyDays: Set<string> = new Set();

type CompendiumCultData = { cultHolyDays: string };
type CompendiumWeaponSkillData = { skillOrigin: string };
type CompendiumJournalData = {
  img: string;
  journalId: string;
  journalPack: string;
};

/*** item update functions to be run by the applyMigrations function on all items in a world ***/

// Update links to journal descriptions & item img
async function relinkJournalEntries(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  const itemName =
    itemData.type === ItemTypeEnum.Skill
      ? normalizeSkillName(itemData.name, itemData.data.category)
      : itemData.name.toLowerCase();
  const mapKey = `${itemData.type}.${itemName}`;
  const compendiumItem = compendiumJournals.get(mapKey);
  if (compendiumItem) {
    unusedCompendiumJournals.delete(mapKey);
    return {
      img: compendiumItem.img,
      data: {
        journalId: compendiumItem.journalId,
        journalPack: compendiumItem.journalPack,
      },
    };
  } else if (hasOwnProperty(itemData.data, "journalId")) {
    unchangedJournalLinks.add(mapKey);
  }
  return {};
}

// Update holyDays field in cult items
async function updateCultHolyDays(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  const compendiumItem = compendiumCultHolyDays.get(itemData.name.toLowerCase());
  if (itemData.type === ItemTypeEnum.Cult) {
    if (compendiumItem) {
      unusedCompendiumCultHolyDays.delete(itemData.name.toLowerCase());
      return {
        data: {
          holyDays: compendiumItem.cultHolyDays,
        },
      };
    } else {
      unchangedCultHolyDays.add(itemData.name.toLowerCase());
    }
  }

  return {};
}

async function relinkWeaponSkillItems(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  let updateData: any = {};
  if (itemData.type === ItemTypeEnum.Weapon) {
    if (itemData.data.usage.oneHand.skillId) {
      updateWeaponSkillOrigin(updateData, "oneHand", itemData, owningActorData);
    }
    if (itemData.data.usage.offHand.skillId) {
      updateWeaponSkillOrigin(updateData, "offHand", itemData, owningActorData);
    }
    if (itemData.data.usage.twoHand.skillId) {
      updateWeaponSkillOrigin(updateData, "twoHand", itemData, owningActorData);
    }
    if (itemData.data.usage.missile.skillId) {
      updateWeaponSkillOrigin(updateData, "missile", itemData, owningActorData);
    }
  }
  return updateData;
}

function updateWeaponSkillOrigin(
  updateData: any,
  usage: string,
  itemData: ItemData,
  owningActorData: ActorData | undefined
): void {
  assertItemType(itemData.type, ItemTypeEnum.Weapon);
  const embeddedSkillName =
    owningActorData?.items
      .find((i) => i._id === (itemData.data.usage as any)[usage].skillId)
      ?.name?.toLowerCase() ?? null;
  const skillItem = compendiumWeaponSkills.get(embeddedSkillName ?? "") ?? null;
  const newSkillOrigin = skillItem?.skillOrigin ?? null;
  if (newSkillOrigin) {
    unusedCompendiumWeaponSkills.delete(embeddedSkillName ?? "");
    updateData = {
      ...updateData,
      data: {
        ...updateData.data,
        usage: {
          ...(updateData.data?.usage ?? {}),
          [usage]: { skillOrigin: newSkillOrigin },
        },
      },
    };
    console.log(`relink ${usage} Weapon updateData`, updateData);
  } else {
    unchangedWeaponSkills.add(embeddedSkillName ?? "");
  }
}

// -------

// Updates the compendiumJournalLinks, compendiumCultHolydays & compendiumWeaponSkills variables
// to contain the data from the most prioritized compendium item.
async function chooseCurrentCompendiumItems(sortedPacks: any[]): Promise<void> {
  for (let pack of sortedPacks) {
    if (pack.metadata.type !== "Item" && pack.metadata.entity !== "Item") {
      continue;
    }
    const items = (await pack.getDocuments()) as unknown as StoredDocument<RqgItem>[];
    for (const item of items) {
      if (!item.name) {
        continue;
      }

      // Save update info about weapon skills
      if (isWeaponSkill(item)) {
        compendiumWeaponSkills.set(item.name.toLowerCase(), {
          skillOrigin: item.uuid,
        });
      }

      // Save update info about cult holy days
      if (item.data.type === ItemTypeEnum.Cult) {
        compendiumCultHolyDays.set(item.name.toLowerCase(), {
          cultHolyDays: item.data.data.holyDays,
        });
      }

      // Save update info about items with journalLinks
      // The items that have journal links are Rune, Skill, Cult, SpiritMagic & RuneMagic
      if (hasOwnProperty(item.data.data, "journalId")) {
        const itemName =
          item.data.type === ItemTypeEnum.Skill
            ? normalizeSkillName(item.name, item.data.data.category)
            : item.name.toLowerCase();

        compendiumJournals.set(`${item.data.type}.${itemName}`, {
          img: item.data.img ?? "",

          journalId: item.data.data.journalId,
          journalPack: item.data.data.journalPack,
        });
      }
    }
  }
  unusedCompendiumJournals = new Map(compendiumJournals);
  unusedCompendiumWeaponSkills = new Map(compendiumWeaponSkills);
  unusedCompendiumCultHolyDays = new Map(compendiumCultHolyDays);
}

// Make sure special case skill descriptions are correctly linked.
// Handles weapons, specialisations, and upper/lower case differences
function normalizeSkillName(itemName: string, category: SkillCategoryEnum): string {
  let normalizedName = itemName ?? "";

  if (category === SkillCategoryEnum.MeleeWeapons) {
    normalizedName = "Melee Weapon (all) - Manipulation";
  }
  if (category === SkillCategoryEnum.MissileWeapons) {
    normalizedName = "Missile Weapon (all) - Manipulation";
  }
  if (category === SkillCategoryEnum.NaturalWeapons) {
    normalizedName = "Melee Weapon (all) - Manipulation";
  }

  normalizedName = normalizedName.toLowerCase();
  const removeSpecialisation = /\(.*\)/;
  normalizedName = normalizedName?.replace(removeSpecialisation, "(...)") ?? "";

  return normalizedName;
}

function isWeaponSkill(item: RqgItem): boolean {
  return (
    // @ts-ignore
    (item.data.type === ItemTypeEnum.Skill || item.data.entity === ItemTypeEnum.Skill) &&
    [
      SkillCategoryEnum.MeleeWeapons,
      SkillCategoryEnum.MissileWeapons,
      SkillCategoryEnum.Shields,
      SkillCategoryEnum.NaturalWeapons,
      // @ts-ignore
    ].includes(item.data.data.category)
  );
}

export async function consolidateCompendiumItems(): Promise<void> {
  // Sort packs in prio order according to scope (module), hardcoded for now
  const prioOrder = ["world", "core-book-rqg", "starter-set-rqg", "rqg"];

  const packs = getGame().packs;
  const sortedPacks = [...packs.entries()]
    .sort(
      (a: any[], b: any[]) =>
        (prioOrder.indexOf(b[0].split(".")[0]) ?? -1) -
        (prioOrder.indexOf(a[0].split(".")[0]) ?? -1)
    )
    .map((p) => p[1]);
  await chooseCurrentCompendiumItems(sortedPacks);

  console.debug(
    "sorted packs:",
    sortedPacks.map((p) => p.metadata.package + "." + p.metadata.name),
    "\njournal links:",
    compendiumJournals,
    "\ncult holy days:",
    compendiumCultHolyDays,
    "\nweapon skills:",
    compendiumWeaponSkills
  );

  const msg = `Consolidating compendium versions in prio order [${prioOrder}].`;
  ui.notifications?.info(
    `${msg} Please be patient and do not close your game or shut down your server.`,
    { permanent: true }
  );
  console.log(`RQG | [${msg}]`);

  await applyMigrations([updateCultHolyDays, relinkJournalEntries, relinkWeaponSkillItems], []);

  console.debug("All Compendium Journal Entries", compendiumJournals);
  console.debug("Unused Compendium Journal Entries", unusedCompendiumJournals);
  console.debug("Unchanged Journal Links", unchangedJournalLinks);

  console.debug("\nAll Compendium Weapon Skills", compendiumWeaponSkills);
  console.debug("Unused Compendium Weapon Skills", unusedCompendiumWeaponSkills);
  console.debug("Unchanged Weapon Skills", unchangedWeaponSkills);

  console.debug("\nAll Compendium Cult Holy Days", compendiumCultHolyDays);
  console.debug("Unused Compendium Cults Holy Days", unusedCompendiumCultHolyDays);
  console.debug("Unchanged Cult Holy Days", unchangedCultHolyDays);

  ui.notifications?.info(`Finished compendium consolidation!`, {
    permanent: true,
  });
  console.log(`RQG | Finished compendium consolidation`);
}
