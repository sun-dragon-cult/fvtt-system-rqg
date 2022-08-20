import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { getGame, systemProp, toKebabCase } from "../../util";
import { Rqid } from "../../api/rqidApi";

const logPrefix = "RQG | Migrate Descr. Link |";

export async function useRqidDescriptionLinks(itemData: ItemData): Promise<ItemUpdate> {
  const updateData: ItemUpdate = {};
  updateData.data = updateData.data ?? {};

  if (hasProperty((itemData as any)[systemProp()], "journalId")) {
    const previousRqidLink = (itemData as any)[systemProp()]?.descriptionRqidLink?.id;
    // Already has a rqidLink - don't update
    if (previousRqidLink) {
      return updateData;
    }
    // Follow & use old style link
    const previousLinkUpdate = await getUpdateViaPreviousLink(itemData);
    if (previousLinkUpdate) {
      updateData.data = previousLinkUpdate as any;
      console.log(
        logPrefix,
        "Followed old style description link and found JE with rqid - updated item with descriptionRqidLink",
        updateData,
        itemData
      );
    } else {
      // No previous link -try if there exists a journal entry with a standard rqid name that matches the item name.
      // This will fix all (unlinked) rune description links since they now have a provided compendium
      const testRqidLink = `je..${toKebabCase(itemData.name)}`;
      const foundJournal = await Rqid.fromRqid(testRqidLink, "en", true); // Only supports lang "en"

      if (foundJournal) {
        // Set the new values
        updateData.data = {
          descriptionRqidLink: {
            name: foundJournal.name ?? "",
            rqid: testRqidLink,
          },
        };
        console.log(
          logPrefix,
          `Didn't find a JE from previous link id [${
            (itemData as any)[systemProp()]?.journalId
          }], compendium [${
            (itemData as any)[systemProp()]?.journalPack
          }] but found a link to a standard named JE [${testRqidLink}] - updated item`,

          updateData,
          itemData
        );
      } else {
        console.debug(
          logPrefix,
          `Didn't find a JE from previous link id [${
            (itemData as any)[systemProp()]?.journalId
          }], compendium [${
            (itemData as any)[systemProp()]?.journalPack
          }] or from default rqid link [${testRqidLink}] - no update`,
          itemData
        );
      }
    }
    // Remove old description link
    (updateData as any).data["-=journalId"] = null;
    (updateData as any).data["-=journalPack"] = null;
    (updateData as any).data["-=journalName"] = null;
  }
  return updateData;
}

async function getUpdateViaPreviousLink(itemData: ItemData): Promise<ItemUpdate | undefined> {
  // Follow the old link and get its values
  const oldJournalId: string | undefined = (itemData as any)[systemProp()]?.journalId;
  if (!oldJournalId) {
    // no previous id - will check if there is a match with default rqid as well...
    return undefined;
  }

  const oldJournalPack: string | undefined = (itemData as any)[systemProp()]?.journalPack;
  const updateData = oldJournalPack
    ? await getUpdateFromCompendium(oldJournalId, oldJournalPack)
    : getUpdateFromWorld(oldJournalId);

  if (!updateData) {
    const msg = `Can't find linked description id [${oldJournalId}] in compendium [${oldJournalPack}]. Misconfiguration in existing description link - No migration done.`;
    console.warn(logPrefix, msg, itemData);
    return undefined;
  }
  return updateData;
}

async function getUpdateFromCompendium(
  oldJournalId: string,
  oldJournalPack: string
): Promise<ItemUpdate | undefined> {
  // Get the old journal entry
  const pack = getGame().packs.get(oldJournalPack);
  if (!pack) {
    const msg = `Can't find linked description compendium: [${oldJournalPack}]. Is the compendium active? - No migration done.`;
    console.warn(logPrefix, msg, oldJournalId, oldJournalPack);
    // TODO give opportunity to relink?
    return undefined;
  }
  // @ts-expect-error indexed
  if (!pack.indexed) {
    await pack.getIndex();
  }

  // @ts-expect-error key
  const indexData = pack.index.find((d) => d._id === oldJournalId);
  if (!indexData) {
    const msg = `Can't get indexData for id [${oldJournalId}] in compendium [${pack.metadata.name}]. - No migration done.`;
    console.warn(logPrefix, msg, oldJournalId, oldJournalPack);
    return undefined;
  }

  return {
    descriptionRqidLink: {
      // @ts-expect-error name
      name: indexData?.name ?? "",
      // @ts-expect-error flags
      rqid: indexData?.flags?.rqg?.documentRqidFlags?.id ?? "",
    },
  };
}

function getUpdateFromWorld(oldJournalId: string): ItemUpdate | undefined {
  const journal = getGame().journal?.find((j) => j.id === oldJournalId);
  if (!journal) {
    const msg = `Can't find journalEntry in world, id: [${oldJournalId}]. No migration done.`;
    console.warn(logPrefix, msg, oldJournalId);
    return;
  }

  return {
    descriptionRqidLink: {
      name: journal.name ?? "",
      rqid: journal.data?.flags?.rqg?.documentRqidFlags?.id ?? "",
    },
  };
}
