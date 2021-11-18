import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getGame, hasOwnProperty } from "../util";
import { RqgItem } from "../../items/rqgItem";
import { applyMigrations, ItemUpdate } from "./applyMigrations";

const compendiumItems = new Map<string, compendiumItemData>();

type compendiumItemData = {
  type: ItemTypeEnum;
  name: string;
  journalId: string;
  journalPack: string;
  cultHolyDays?: string;
  img: string;
};

// item update function to be run by the applyMigrations function on all items in a world
async function consolidate(itemData: ItemData, owningActorData?: ActorData): Promise<ItemUpdate> {
  const compendiumItem = compendiumItems.get(`${itemData.type}.${itemData.name}`);
  if (compendiumItem) {
    return {
      img: compendiumItem.img,
      data: {
        journalId: compendiumItem.journalId,
        journalPack: compendiumItem.journalPack,
        holyDays: compendiumItem.cultHolyDays,
      },
    };
  }
  return {};
}

// Updates the compendiumItems variable to contain the data from the most prioritized compendium item.
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

      // The items that has journal links are Rune, Skill, Cult, SpiritMagic & RuneMagic
      if (!hasOwnProperty(item.data.data, "journalId")) {
        continue;
      }

      compendiumItems.set(`${item.data.type}.${item.name}`, {
        type: item.data.type,
        name: item.name,
        journalId: item.data.data.journalId,
        journalPack: item.data.data.journalPack,
        cultHolyDays: hasOwnProperty(item.data.data, "holyDays")
          ? item.data.data.holyDays
          : undefined,
        img: item.data.img ?? "",
      });
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

  const msg = `Consolidating compendium versions in prio order [${prioOrder}].`;
  ui.notifications?.info(
    `${msg} Please be patient and do not close your game or shut down your server.`,
    { permanent: true }
  );
  console.log(`RQG | [${msg}]`);

  await applyMigrations([consolidate], []);

  ui.notifications?.info(`Finished compendium consolidation!`, {
    permanent: true,
  });
  console.log(`RQG | Finished compendium consolidation`);
}
