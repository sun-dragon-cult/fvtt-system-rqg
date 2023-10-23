import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { systemId } from "../config";
import { getAvailableRunes, getGame, localize, RqgError, toKebabCase, trimChars } from "../util";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import type { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";

// TODO Look into enhancing typing of rqid strings like this
export type RqidString =
  | `${string}.${string}.${string}`
  | `${string}.${string}.${string}.${string}.${string}.${string}`;

/**
 * Handles rqid ids. These IDs are a string that is constructed like `i.skill.act`.
 * The first part (rqidDocumentName) is a shorthand to the foundry Document names (like Item, Actor) for the supported documents. See Rqid.documentNameLookup
 * The second part (document type) is the same as the document type in Foundry (like weapon, skill, etc). Can be empty.
 * The third part ()
 *
 */
export class Rqid {
  public static init(): void {
    // Include rqid flags in index for compendium packs

    // @ts-expect-error compendiumIndexFields
    CONFIG.Actor.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.Cards.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.Item.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.JournalEntry.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.Macro.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.Playlist.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.RollTable.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
    // @ts-expect-error compendiumIndexFields
    CONFIG.Scene.compendiumIndexFields.push("flags.rqg.documentRqidFlags");
  }

  /**
   * Return the highest priority Document matching the supplied rqid and lang from the Documents in the World. If not
   * found return the highest priority Document matching the supplied rqid and lang from the installed Compendium packs.
   * If lang parameter is not supplied the language selected for the world will be used.
   * If no document is found with the specified lang, then "en" will be used as a fallback.
   */
  public static async fromRqid(
    rqid: string | undefined,
    lang?: string,
    silent: boolean = false,
  ): Promise<Document<any, any> | undefined> {
    if (!rqid) {
      return undefined;
    }

    lang = lang ?? getGame().settings.get(systemId, "worldLanguage");

    const worldItem = await Rqid.documentFromWorld(rqid, lang);
    if (worldItem) {
      return worldItem;
    }

    const packItem = await Rqid.documentFromPacks(rqid, lang);
    if (packItem) {
      return packItem;
    }

    if (lang?.toLowerCase() !== CONFIG.RQG.fallbackLanguage) {
      return Rqid.fromRqid(rqid, CONFIG.RQG.fallbackLanguage, silent);
    }

    if (!silent) {
      const msg = localize("RQG.RQGSystem.Error.DocumentNotFoundByRqid", {
        rqid: rqid,
        lang: lang,
      });
      // @ts-expect-error console
      ui.notifications?.warn(msg, { console: false });
      console.warn("RQG |", msg);
    }
    return undefined;
  }

  /**
   * Returns all documents with an rqid matching the regex and matching the document type
   * and language, from the specified scope. The valid values for scope are:
   *
   * * **match**: same logic as fromRqid function,
   * * **all**: find in both world & compendium packs,
   * * **world**: only search in world,
   * * **packs**: only search in compendium packs
   * @param rqidRegex regex used on the rqid
   * @param rqidDocumentName the first part of the wanted rqid, for example "i", "a", "je"
   * @param lang the language to match against ("en", "es", ...)
   * @param scope defines where it will look
   */
  public static async fromRqidRegexAll(
    rqidRegex: RegExp | undefined,
    rqidDocumentName: string, // like "i", "a", "je"
    lang: string = "en",
    scope: "match" | "all" | "world" | "packs" = "match",
  ): Promise<Document<any, any>[]> {
    if (!rqidRegex) {
      return [];
    }
    const result: Document<any, any>[] = [];

    let worldDocuments: Document<any, any>[] = [];
    if (["match", "all", "world"].includes(scope)) {
      worldDocuments = await Rqid.documentsFromWorld(rqidRegex, rqidDocumentName, lang);
      result.splice(0, 0, ...worldDocuments);
    }

    if (["match", "all", "packs"].includes(scope)) {
      let packDocuments = await Rqid.documentsFromPacks(rqidRegex, rqidDocumentName, lang);

      if (scope === "match") {
        const worldDocumentRqids = [
          ...new Set(worldDocuments.map((d) => d.getFlag(systemId, documentRqidFlags)?.id)),
        ];
        // Remove any rqid matches that exists in the world
        packDocuments = packDocuments.filter(
          (d) => !worldDocumentRqids.includes(d.getFlag(systemId, documentRqidFlags)?.id),
        );
      }
      result.splice(result.length, 0, ...packDocuments);
    }

    return result;
  }

  /**
   * Gets only the highest priority documents for each rqid that matches the Regex and
   * language, with the highest priority documents in the World taking precedence over
   * any documents in compendium packs.
   * @param rqidRegex regex used on the rqid
   * @param rqidDocumentName the first part of the wanted rqid, for example "i", "a", "je"
   * @param lang the language to match against ("en", "es", ...)
   */
  public static async fromRqidRegexBest(
    rqidRegex: RegExp | undefined,
    rqidDocumentName: string, // like "i", "a", "je"
    lang: string = "en",
  ): Promise<Document<any, any>[]> {
    const matchingDocuments = await this.fromRqidRegexAll(
      rqidRegex,
      rqidDocumentName,
      lang,
      "match",
    );
    return this.filterBestRqid(matchingDocuments);
  }

  /**
   * For an array of documents, returns only those that are the "best" version of their Rqid
   * @param documents
   * @returns
   */
  public static filterBestRqid(documents: Document<any, any>[]): Document<any, any>[] {
    const highestPrioDocuments = new Map<string, Document<any, any>>();

    for (const doc of documents) {
      const docPrio: number = doc.getFlag(systemId, documentRqidFlags)?.priority;
      const docRqid: string = doc.getFlag(systemId, documentRqidFlags)?.id;
      const currentHighestPrio =
        highestPrioDocuments.get(docRqid)?.getFlag(systemId, documentRqidFlags)?.priority ??
        -Infinity;
      if (docPrio > currentHighestPrio) {
        highestPrioDocuments.set(docRqid, doc);
      }
    }

    return [...highestPrioDocuments.values()];
  }

  /**
   * Return how many document match the supplied rqid.
   */
  public static async fromRqidCount(
    rqid: string | undefined,
    lang: string = "en",
    scope: "all" | "world" | "packs" = "all",
  ): Promise<number> {
    if (!rqid) {
      return 0;
    }

    let count = 0;

    // Check World
    if (["all", "world"].includes(scope)) {
      count = (getGame() as any)[this.getGameProperty(rqid)]?.contents.reduce(
        (count: number, document: Document<any, any>) => {
          if (
            document.getFlag(systemId, documentRqidFlags)?.id === rqid &&
            document.getFlag(systemId, documentRqidFlags)?.lang === lang
          ) {
            count++;
          }
          return count;
        },
        0,
      );
    }

    if (count > 0) {
      return count;
    }

    // Check compendium packs
    if (["all", "packs"].includes(scope)) {
      const documentName = Rqid.getDocumentName(rqid);
      for (const pack of getGame().packs) {
        if (pack.documentClass.documentName === documentName) {
          // @ts-expect-error indexed
          if (!pack.indexed) {
            await pack.getIndex();
          }
          // TODO fix typing when upgrading type versions!
          const countInPack = (pack.index as any).reduce((sum: number, indexData: any) => {
            if (
              indexData?.flags?.rqg?.documentRqidFlags?.id === rqid &&
              indexData?.flags?.rqg?.documentRqidFlags?.lang === lang
            ) {
              sum++;
            }
            return sum;
          }, 0);
          count += countInPack;
        }
      }
    }
    return count;
  }

  /**
   * Given a Document, create a valid rqid string for the document.
   */
  public static getDefaultRqid(document: Document<any, any>): string {
    if (!document.name) {
      return "";
    }

    const rqidDocumentString = Rqid.getRqidDocumentName(document);
    // @ts-expect-error v10
    const documentSubType = toKebabCase(document.type ?? "");
    let rqidIdentifier = "";

    if (document instanceof Item) {
      if (document.type === ItemTypeEnum.Skill) {
        rqidIdentifier = trimChars(
          // @ts-expect-error system
          toKebabCase(`${document.system.skillName ?? ""}-${document.system.specialization ?? ""}`),
          "-",
        );
      }
      if (document.type === ItemTypeEnum.Armor) {
        rqidIdentifier = trimChars(
          toKebabCase(
            // @ts-expect-error system
            `${document.system.namePrefix ?? ""}-${document.system.armorType ?? ""}-${
              // @ts-expect-error system
              document.system.material ?? ""
            }`,
          ),
          "-",
        );
      }
    }
    if (!rqidIdentifier) {
      rqidIdentifier = trimChars(toKebabCase(document.name), "-");
    }

    return `${rqidDocumentString}.${documentSubType}.${rqidIdentifier}`;
  }

  /**
   * Render the sheet of the documents the rqid points to and brings it to top.
   */
  public static async renderRqidDocument(rqid: string, anchor?: string): Promise<void> {
    const document = await Rqid.fromRqid(rqid);
    if (document != null && rqid.split(".")?.[3] === "jp") {
      const journal = document.parent;
      await journal?.sheet?._render(true, { focus: true });
      journal?.sheet.goToPage(document.id, anchor);
    } else {
      // @ts-expect-error all rqid supported documents have sheet
      document?.sheet?.render(true, { focus: true });
    }
  }

  /**
   * Given a Document, set its rqid to the provided value with the supplied language and priority.
   * Ensures the right flag scope and flag variable name will be used.
   * Returns the new rqid flag
   */
  public static async setRqid(
    document: Document<any, any>,
    newRqid: string,
    lang: string = "en",
    priority: number = 0,
  ): Promise<any> {
    const rqid = {
      id: newRqid,
      lang: lang,
      priority: priority,
    };

    await document.setFlag(systemId, documentRqidFlags, rqid);

    return rqid;
  }

  /**
   * Given a Document, set its rqid to the default rqid with the supplied language and priority.
   * Ensures the right flag scope and flag variable name will be used.
   * Returns the new rqid flag
   */
  public static async setDefaultRqid(
    document: Document<any, any>,
    lang: string = "en",
    priority: number = 0,
  ): Promise<any> {
    const newRqid = this.getDefaultRqid(document);
    if (newRqid === "") {
      return;
    }

    return await this.setRqid(document, newRqid, lang, priority);
  }

  // ----------------------------------

  /**
   * Get a single document from the rqid / language. The document with the highest priority
   * will be chosen and an error is shown if there are more than one document with the same
   * priority in the world.
   */
  private static async documentFromWorld(
    rqid: string,
    lang: string,
  ): Promise<Document<any, any> | undefined> {
    if (!rqid) {
      return undefined;
    }
    const documentRqid = Rqid.documentRqid(rqid);
    const embeddedDocumentsRqid = Rqid.embeddedDocumentRqid(rqid);

    const candidateDocuments: Document<any, any>[] = (getGame() as any)[
      this.getGameProperty(documentRqid)
    ]?.contents
      .filter(
        (doc: Document<any, any>) =>
          doc.getFlag(systemId, documentRqidFlags)?.id === documentRqid &&
          doc.getFlag(systemId, documentRqidFlags)?.lang === lang,
      )
      .sort(Rqid.compareRqidPrio);

    if (candidateDocuments === undefined || candidateDocuments.length === 0) {
      return undefined;
    }

    const highestPrio = candidateDocuments[0].getFlag(systemId, documentRqidFlags)?.priority;
    const highestPrioDocuments = candidateDocuments.filter(
      (doc) => doc.getFlag(systemId, documentRqidFlags)?.priority === highestPrio,
    );

    if (highestPrioDocuments.length > 1) {
      const msg = localize("RQG.RQGSystem.Error.MoreThanOneRqidMatchInWorld", {
        rqid: rqid,
        lang: lang,
        priority: candidateDocuments[0]?.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
      });
      // @ts-expect-error console
      ui.notifications?.warn(msg, { console: false });
      // TODO maybe offer to open the duplicates to make it possible for the GM to correct this?
      // TODO Or should this be handled in the compendium browser eventually?
      console.warn(msg + "  Duplicate items: ", candidateDocuments);
    }
    return this.getEmbeddedOrProvidedDocument(highestPrioDocuments[0], embeddedDocumentsRqid);
  }

  private static getEmbeddedOrProvidedDocument(document: any, embeddedDocumentsRqid: string) {
    if (
      embeddedDocumentsRqid &&
      typeof document.getBestEmbeddedDocumentByRqid === "function" // Not all documents support embedded rqid documents
    ) {
      return document.getBestEmbeddedDocumentByRqid(embeddedDocumentsRqid);
    } else {
      return document;
    }
  }

  /**
   * Get a list of all documents matching the rqid regex & language from the world.
   * The document list is sorted with the highest priority first.
   */
  private static async documentsFromWorld(
    rqidRegex: RegExp | undefined,
    rqidDocumentName: string,
    lang: string,
  ): Promise<Document<any, any>[]> {
    if (!rqidRegex) {
      return [];
    }

    const gameProperty = Rqid.getGameProperty(`${rqidDocumentName}..`);
    const candidateDocuments = (getGame() as any)[gameProperty]?.filter(
      (d: Document<any, any>) =>
        rqidRegex.test(d.getFlag(systemId, documentRqidFlags)?.id) &&
        d.getFlag(systemId, documentRqidFlags)?.lang === lang,
    );

    if (candidateDocuments == null) {
      return [];
    }

    return candidateDocuments.sort(Rqid.compareRqidPrio);
  }

  /**
   * Get a single document from the rqid / language. The document with the highest priority
   * will be chosen and an error is shown if there are more than one document with the same
   * priority in the compendium packs.
   */
  private static async documentFromPacks(
    rqid: string,
    lang: string,
  ): Promise<Document<any, any> | undefined> {
    if (!rqid) {
      return undefined;
    }
    const documentRqid = Rqid.documentRqid(rqid);
    const embeddedDocumentsRqid = Rqid.embeddedDocumentRqid(rqid);
    const documentName = Rqid.getDocumentName(documentRqid);
    const indexCandidates: { pack: any; indexData: any }[] = [];

    for (const pack of getGame().packs) {
      if (pack.documentClass.documentName === documentName) {
        // @ts-expect-error indexed
        if (!pack.indexed) {
          await pack.getIndex();
        }
        // TODO fix typing when upgrading type versions!
        const indexInstances: any[] = (pack.index as any).filter(
          (i: any) =>
            i?.flags?.rqg?.documentRqidFlags?.id === documentRqid &&
            i?.flags?.rqg?.documentRqidFlags?.lang === lang, // &&
        );
        indexInstances.forEach((i) => indexCandidates.push({ pack: pack, indexData: i }));
      }
    }

    if (indexCandidates.length === 0) {
      return undefined;
    }

    const sortedCandidates = indexCandidates.sort(Rqid.compareCandidatesPrio);
    const topPrio = sortedCandidates[0].indexData.flags.rqg.documentRqidFlags.priority;
    const result = sortedCandidates.filter(
      (i: any) => i.indexData.flags.rqg.documentRqidFlags.priority === topPrio,
    );

    if (result.length > 1) {
      const msg = localize("RQG.RQGSystem.Error.MoreThanOneRqidMatchInPacks", {
        rqid: rqid,
        lang: lang,
        priority: result[0].indexData.flags.rqg.documentRqidFlags.priority ?? "---",
      });
      // @ts-expect-error console
      ui.notifications?.warn(msg, { console: false });
      // TODO maybe offer to open the duplicates to make it possible for the GM to correct this?
      console.warn(msg + "  Duplicate items: ", result);
    }
    const highestPrioDocument = await result[0].pack.getDocument(result[0].indexData._id);
    return this.getEmbeddedOrProvidedDocument(highestPrioDocument, embeddedDocumentsRqid);
  }

  /**
   * Get a list of all documents matching the rqid regex & language from the compendium packs.
   * The document list is sorted with the highest priority first.
   */
  private static async documentsFromPacks(
    rqidRegex: RegExp,
    rqidDocumentName: string,
    lang: string,
  ): Promise<Document<any, any>[]> {
    if (!rqidRegex) {
      return [];
    }
    const documentName = Rqid.getDocumentName(`${rqidDocumentName}..fake-rqid`);
    const candidateDocuments: Document<any, any>[] = [];

    for (const pack of getGame().packs) {
      if (pack.documentClass.documentName === documentName) {
        // @ts-expect-error indexed
        if (!pack.indexed) {
          await pack.getIndex();
        }
        // TODO fix typing when upgrading type versions!
        const indexInstances: any[] = (pack.index as any).filter(
          (i: any) =>
            rqidRegex.test(i?.flags?.rqg?.documentRqidFlags?.id) &&
            i?.flags?.rqg?.documentRqidFlags?.lang === lang,
        );
        for (const index of indexInstances) {
          const document = await pack.getDocument(index._id);
          if (!document) {
            const msg = localize("RQG.RQGSystem.Error.DocumentNotFoundByRqid", {
              rqid: rqidRegex,
              lang: lang,
            });
            // @ts-expect-error console
            ui.notifications?.error(msg, { console: false });
            console.error("RQG |", msg, index);
            throw new RqgError(msg, index, indexInstances);
          }
          candidateDocuments.push(document);
        }
      }
    }
    return candidateDocuments.sort(Rqid.compareRqidPrio);
  }

  /**
   * Sort a list of document on rqid priority - the highest first.
   * @example
   * aListOfDocuments.sort(Rqid.compareRqidPrio)
   */
  public static compareRqidPrio<T extends Document<any, any>>(a: T, b: T): number {
    return (
      b.getFlag(systemId, documentRqidFlags)?.priority -
      a.getFlag(systemId, documentRqidFlags)?.priority
    );
  }

  public static getRqidIcon(rqid: string | undefined): string | undefined {
    const rqidDocumentString = rqid?.split(".")[0];

    // Use RQG default item type images for item documents
    if (rqidDocumentString === "i") {
      const itemType = Rqid.getDocumentType(rqid);

      // Special handling for rune items to display the actual rune instead of the default item image
      if (itemType === ItemTypeEnum.Rune) {
        const rune = getAvailableRunes().find((r) => r.rqid === rqid);
        if (!rune) {
          const msg = localize("RQG.RQGSystem.CouldNotFindRune", { rqid: rqid });
          // @ts-expect-error console
          ui.notifications?.warn(msg, { console: false });
          console.warn(`RQG | ${msg}`);
        } else {
          return `<img src="${rune.img}"/>`;
        }
      }

      const iconSettings: any = getGame().settings.get(systemId, "defaultItemIconSettings");
      const defaultItemIcon = itemType && iconSettings[itemType];
      if (defaultItemIcon) {
        // TODO If undefined then the rqid is invalid since all items need a type
        return `<img src="${defaultItemIcon}"/>`;
      }
    }

    // Use Foundry default document images
    const configPart =
      rqidDocumentString && Rqid.documentLinkIconsConfigName.get(rqidDocumentString);
    if (!rqidDocumentString || !configPart) {
      return undefined;
    }
    const linkIcon = (CONFIG as any)[configPart]?.sidebarIcon ?? "fas fa-fingerprint";
    return `<i class="${linkIcon}"></i>`;
  }

  private static readonly documentLinkIconsConfigName = new Map([
    ["a", "Actor"],
    ["c", "Cards"],
    ["i", "Item"],
    ["je", "JournalEntry"],
    ["jp", "JournalEntryPage"],
    ["m", "Macro"],
    ["p", "Playlist"],
    ["rt", "RollTable"],
    ["s", "Scene"],
  ]);

  /**
   * Sort a list of indexCandidates on rqid priority - the highest first.
   */
  private static compareCandidatesPrio(a: any, b: any): number {
    return (
      b.indexData?.flags?.rqg?.documentRqidFlags?.priority -
      a.indexData?.flags?.rqg?.documentRqidFlags?.priority
    );
  }

  /**
   *   Translates the first part of a rqid (rqidDocumentName) to what those documents are called in the `game` object.
   */
  private static getGameProperty(rqid: string | undefined): string {
    const rqidDocumentName = rqid?.split(".")[0];
    const gameProperty = rqidDocumentName && Rqid.gamePropertyLookup[rqidDocumentName];
    if (!gameProperty) {
      const msg = "Tried to convert rqid with non existing document type";
      throw new RqgError(msg, rqid);
    }
    return gameProperty;
  }

  private static readonly gamePropertyLookup: { [rqidDocumentName: string]: string } = {
    a: "actors",
    c: "cards",
    i: "items",
    je: "journal",
    m: "macros",
    p: "playlists",
    rt: "tables",
    s: "scenes",
  };

  /**
   *   Translates the first part of a rqid to a Foundry document name (like "Item").
   */
  public static getDocumentName(rqid: string | undefined): string {
    const rqidDocumentName = rqid?.split(".")[0];
    const documentName = rqidDocumentName && Rqid.documentNameLookup[rqidDocumentName];
    if (!documentName) {
      const msg = "Tried to convert rqid with non existing document type";
      throw new RqgError(msg, rqid);
    }
    return documentName;
  }

  private static readonly documentNameLookup: { [rqidDocumentName: string]: string } = {
    a: "Actor",
    c: "Card",
    i: "Item",
    je: "JournalEntry",
    jp: "JournalEntryPage", // Only allowed as embedded in JournalEntry
    m: "Macro",
    p: "Playlist",
    rt: "RollTable",
    s: "Scene",
  };

  /**
   * Get the document type from the rqid if it exists. For example i.skill.act returns "skill".
   * Does not check if the type is valid in the system.
   */
  public static getDocumentType(rqid: string | undefined): string | undefined {
    return rqid?.split(".")[1];
  }

  /**
   * Get the first part of a rqid (like "i") from a Document.
   */
  private static getRqidDocumentName(document: Document<any, any>): string {
    const documentString = Rqid.rqidDocumentNameLookup[document.documentName];
    if (!documentString) {
      const msg = "Tried to convert a unsupported document to rqid";
      throw new RqgError(msg, document);
    }
    return documentString;
  }

  /**
   *  Reverse lookup from DocumentType to rqidDocument ("Item" -> "i").
   */
  private static readonly rqidDocumentNameLookup: { [documentName: string]: string } =
    Object.entries(Rqid.documentNameLookup).reduce(
      (acc: { [k: string]: string }, [key, value]) => ({ ...acc, [value]: key }),
      {},
    );

  /**
   * Get the main level document rqid from a rqid that could contain a reference
   * to an embedded document such as `a.character.nisse.i.skill.act` -> `a.character.nisse`
   */
  private static documentRqid(rqid: string): string {
    return rqid.split(".").slice(0, 3).join(".");
  }

  /**
   * Get the embedded level document rqid from a rqid
   * such as `a.character.nisse.i.skill.act` -> `i.skill.act`. Will return an empty string
   * if no embedded rqid exists
   */
  private static embeddedDocumentRqid(rqid: string): string {
    return rqid.split(".").slice(3, 6).join(".");
  }
}
