import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getGame, hasOwnProperty } from "../util";
import { RqgItem } from "../../items/rqgItem";
import { applyMigrations, ItemUpdate } from "./applyMigrations";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";

const compendiumCultHolyDays = new Map<string, CompendiumCultData>(); // key is cult name
const compendiumWeaponSkills = new Map<string, CompendiumWeaponSkillData>(); // key is skill name
const compendiumJournalLinks = new Map<string, CompendiumJournalData>(); // key is "<itemType>.<itemName>"

type CompendiumCultData = { cultHolyDays: string };
type CompendiumWeaponSkillData = { img: string; skillOrigin: string };
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
  const compendiumItem = compendiumJournalLinks.get(`${itemData.type}.${itemData.name}`);
  if (compendiumItem) {
    return {
      img: compendiumItem.img,
      data: {
        journalId: compendiumItem.journalId,
        journalPack: compendiumItem.journalPack,
      },
    };
  }
  return {};
}

// Update holyDays field in cult items
async function updateCultHolyDays(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  const compendiumItem = compendiumCultHolyDays.get(itemData.name);
  if (itemData.type === ItemTypeEnum.Cult && compendiumItem) {
    return {
      data: {
        holyDays: compendiumItem.cultHolyDays,
      },
    };
  }
  return {};
}

async function relinkWeaponSkillItems(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  // if (itemData.type === ItemTypeEnum.Weapon) {
  //   if (itemData.data.usage.oneHand.skillId) {
  //     const embeddedSkillName = owningActorData?.items.get(
  //       itemData.data.usage.oneHand.skillId
  //     ).name;
  //     const skillItem = skillItems.get(`${itemData.type}.${itemData.name}`);
  //
  //     itemData.data.usage.oneHand.skillOrigin = xxx;
  //   }
  //   return {
  //     skillOrigin: skillItem.origin,
  //     data: {
  //       // TODO *** FIXME ***
  //     },
  //   };
  // }
  return {};
}

// -------

// Updates the compendiumJournalLinks, compendiumCultHolydays & compendiumWeaponSkills variables
// to contain the data from the most prioritized compendium item.
async function chooseCurrentCompendiumItems(sortedPacks: any[]): Promise<void> {
  for (let pack of sortedPacks) {
    if (pack.metadata.entity !== "Item") {
      continue;
    }
    const items = (await pack.getDocuments()) as unknown as StoredDocument<RqgItem>[];
    for (const item of items) {
      if (!item.name) {
        continue;
      }

      // Save update info about weapon skills
      if (
        item.data.type === ItemTypeEnum.Skill &&
        [
          SkillCategoryEnum.MeleeWeapons,
          SkillCategoryEnum.MissileWeapons,
          SkillCategoryEnum.Shields,
          SkillCategoryEnum.NaturalWeapons,
        ].includes(item.data.data.category)
      ) {
        compendiumWeaponSkills.set(item.data.name, {
          img: item.data.img ?? "",
          skillOrigin: item.id,
        });
      }

      // Save update info about cult holy days
      if (item.data.type === ItemTypeEnum.Cult) {
        compendiumCultHolyDays.set(item.name, {
          cultHolyDays: item.data.data.holyDays,
        });
      }

      // Save update info about items with journalLinks
      // The items that have journal links are Rune, Skill, Cult, SpiritMagic & RuneMagic
      if (hasOwnProperty(item.data.data, "journalId")) {
        compendiumJournalLinks.set(`${item.data.type}.${item.name}`, {
          img: item.data.img ?? "",
          journalId: item.data.data.journalId,
          journalPack: item.data.data.journalPack,
        });
      }
    }
  }
}

export async function consolidateCompendiumItems(): Promise<void> {
  // Sort packs in prio order according to scope (module), hardcoded for now
  const prioOrder = ["world", "core-book", "starter-set", "rqg"];

  const packs = getGame().packs;
  const sortedPacks = [...packs.entries()]
    .sort(
      (a: any[], b: any[]) =>
        (prioOrder.indexOf(b[0].split(".")[0]) ?? -1) -
        (prioOrder.indexOf(a[0].split(".")[0]) ?? -1)
    )
    .map((p) => p[1]);
  await chooseCurrentCompendiumItems(sortedPacks);

  console.debug(compendiumJournalLinks, compendiumCultHolyDays, compendiumWeaponSkills);

  const msg = `Consolidating compendium versions in prio order [${prioOrder}].`;
  ui.notifications?.info(
    `${msg} Please be patient and do not close your game or shut down your server.`,
    { permanent: true }
  );
  console.log(`RQG | [${msg}]`);

  await applyMigrations([updateCultHolyDays, relinkJournalEntries, relinkWeaponSkillItems], []);

  ui.notifications?.info(`Finished compendium consolidation!`, {
    permanent: true,
  });
  console.log(`RQG | Finished compendium consolidation`);
}
