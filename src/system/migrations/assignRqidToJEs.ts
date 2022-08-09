import { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import { getGame } from "../util";
import { Rqid } from "../api/rqidApi";

export async function assignRqidToJEs(): Promise<void> {
  console.info("--- Assigning rqid to world journal entries ---");
  for (const je of getGame()?.journal ?? []) {
    const rqidFlags = je.getFlag("rqg", "documentRqidFlags") ?? {};

    console.debug("Existing rqid Flags in world", rqidFlags);
    // Add a rqid if it does not already have one
    if (!rqidFlags?.id) {
      rqidFlags.id = await generateRqid(je, "world");
      rqidFlags.lang = rqidFlags?.lang ? rqidFlags.lang : "en";
      rqidFlags.priority = rqidFlags?.priority ? rqidFlags.priority : 19;

      console.log("...setting world rqid", rqidFlags);
      await je.setFlag("rqg", "documentRqidFlags", rqidFlags);
    }
  }

  console.info("--- Assigning rqid to compendia journal entries ---");
  // Keep track of what Rqids this script has already added since the index won't be updated during the runs so
  // newly added duplicates won't be detected.
  const addedRqids: string[] = [];
  for (const pack of getGame()?.packs) {
    if (pack.documentClass.name === "JournalEntry") {
      // @ts-expect-error indexed
      if (!pack.indexed) {
        await pack.getIndex();
      }
      for (const jei of pack.index) {
        // @ts-expect-error flags
        const rqidFlags = jei?.flags?.rqg?.documentRqidFlags ?? {};

        console.debug(
          "Existing rqid Flags in compendium",
          pack.metadata.package,
          pack.metadata.name,
          rqidFlags
        );
        // Add a rqid if it does not already have one
        if (!rqidFlags?.id) {
          // @ts-expect-error _id
          const je = (await pack.getDocument(jei._id)) as Document<any, any> | undefined;
          if (!je) {
            console.error("Couldn't get journal entry from pack!!!");
            continue;
          }
          rqidFlags.id = await generateRqid(je, "compendiums", addedRqids);
          rqidFlags.lang = rqidFlags?.lang ? rqidFlags.lang : "en";
          rqidFlags.priority = rqidFlags?.priority ? rqidFlags.priority : 1999;

          console.log("...setting compendium rqid", rqidFlags);

          const wasLocked = pack.locked;
          await pack.configure({ locked: false });
          await je.setFlag("rqg", "documentRqidFlags", rqidFlags);
          // Apply the original locked status for the pack
          await pack.configure({ locked: wasLocked });
        }
      }
    }
  }
  console.info("--- Done assigning rqids to journal entries ---");

  /**
   * Generate a unique rqid for the JournalEntry.
   * Assumes the JE does not yet have a rqid.
   * Also assumes english only rqids.
   * As a side effect update the `alreadyAddedRqids` array with the "base" rqid without the count postfix part.
   **/
  async function generateRqid(
    je: Document<any, any>,
    scope: "all" | "world" | "compendiums",
    alreadyAddedRqids: string[] = []
  ): Promise<string> {
    const proposedRqid = Rqid.getDefaultRqid(je);
    const count = await Rqid.fromRqidCount(proposedRqid, "en", scope);
    const alreadyAddedCount = alreadyAddedRqids.filter(
      (alreadyAddedRqid) => alreadyAddedRqid === proposedRqid
    ).length;
    const totalCount = count + alreadyAddedCount;
    const postfixCount = !!totalCount ? "-" + (Number(totalCount) + 1) : "";
    alreadyAddedRqids.push(proposedRqid);
    return `${proposedRqid}${postfixCount}`;
  }
}
