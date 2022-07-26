import { Homeland } from "../../actors/item-specific/homeland";
import { RqgActor } from "../../actors/rqgActor";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItem } from "../../items/rqgItem";
import { systemId } from "../config";
import { getGame, localize, RqgError, toKebabCase, trimChars } from "../util";
import { documentRqidFlags, DocumentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";

export class Rqid {
  /**
   * Return the highest priority Document matching the supplied rqid and lang from the Documents in the World. If not
   * found return the highest priority Document matching the supplied rqid and lang from the installed Compendia.
   */
  public static async fromRqid(
    rqid: string | undefined,
    lang: string = "en",
    silent: boolean = false
  ): Promise<Document<any, any> | undefined> {
    if (!rqid) {
      return undefined;
    }

    const worldItem = await Rqid.documentFromWorldRqid(rqid, lang);
    if (worldItem) {
      return worldItem;
    }

    const compendiumItem = await Rqid.documentFromCompendiaRqid(rqid, lang);
    if (compendiumItem) {
      return compendiumItem;
    }

    if (!silent) {
      const msg = localize("RQG.RQGSystem.Error.DocumentNotFoundByRqid", {
        rqid: rqid,
        lang: lang,
      });
      ui.notifications?.warn(msg);
      console.log(msg);
    }
    return undefined;
  }

  /**
   * Given a Document, create a valid rqid string for the document.
   */
  public static getDefaultRqid(document: Document<any, any>): string {
    if (!document.name) {
      return "";
    }

    const rqidDocumentString = Rqid.getRqidDocumentString(document);
    const documentSubType = toKebabCase(document.data.type ?? "");
    let rqidIdentifier = "";

    if (document instanceof Item) {
      if (document.data.type === ItemTypeEnum.Skill) {
        rqidIdentifier = trimChars(
          toKebabCase(`${document.data.data.skillName}-${document.data.data.specialization}`),
          "-"
        );
      }
      if (document.data.type === ItemTypeEnum.Armor) {
        rqidIdentifier = trimChars(
          toKebabCase(
            `${document.data.data.namePrefix}-${document.data.data.armorType}-${document.data.data.material}`
          ),
          "-"
        );
      }
    }
    if (!rqidIdentifier) {
      rqidIdentifier = toKebabCase(document.name);
    }

    return `${rqidDocumentString}.${documentSubType}.${rqidIdentifier}`;
  }

  /**
   * For Documents that have a sheet, render it.
   */
  public static async renderRqidDocument(rqid: string) {
    const document = (await Rqid.fromRqid(rqid)) as any;
    if (document?.sheet) {
      // Not all documents have sheet
      document?.sheet?.render(true);
    } else {
      const msg = localize("RQG.Item.Notification.RqidFromLinkNotFound", { rqid: rqid });
      ui.notifications?.warn(msg);
      console.log(msg, "Document without sheet:", document);
    }
  }

  // ----------------------------------

  private static async documentFromWorldRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<Document<any, any> | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates = (getGame() as any)[this.getGameProperty(rqid)]?.contents.filter(
      (i: Document<any, any>) =>
        i.getFlag(systemId, documentRqidFlags)?.id === rqid &&
        i.getFlag(systemId, documentRqidFlags)?.lang === lang
    );

    if (candidates === undefined || candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 1) {
      const msg = localize("RQG.RQGSystem.Error.MoreThanOneRqidMatchInWorld", {
        rqid: rqid,
        lang: lang,
        priority: candidates[0]?.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", candidates);
    }
    return candidates[0];
  }

  private static async documentFromCompendiaRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<Document<any, any> | undefined> {
    if (!rqid) {
      return undefined;
    }
    const documentType = Rqid.getDocumentType(rqid);

    const candidates: Document<any, any>[] = [];

    for (const pack of getGame().packs) {
      if (pack.documentClass.name === documentType) {
        // @ts-expect-error indexed
        if (!pack.indexed) {
          await pack.getIndex();
        }
        // TODO fix typing when upgrading type versions!
        const indexInstances: any[] = (pack.index as any).filter(
          (i: any) =>
            i?.flags?.rqg?.documentRqidFlags?.id === rqid &&
            i?.flags?.rqg?.documentRqidFlags?.lang === lang &&
            // don't add if we already have a Document with higher priority
            i?.flags?.rqg?.documentRqidFlags?.priority >=
              Math.max(
                ...candidates.map(
                  (candidate: any) =>
                    (candidate.getFlag(systemId, documentRqidFlags)?.priority as number) ??
                    -Infinity
                )
              )
        );
        for (const index of indexInstances) {
          const document = await pack.getDocument(index._id);
          if (!document) {
            const msg = localize("RQG.RQGSystem.Error.DocumentNotFoundByRqid", {
              rqid: rqid,
              lang: lang,
            });
            ui.notifications?.error(msg);
            console.log("RQG | " + msg, index);
            throw new RqgError(msg, index, indexInstances);
          }
          candidates.push(document);
        }
      }
    }

    // We can get multiple results depending on the order we find the documents (and if there are duplicates)
    let highestPrioCandidate = this.getHighestPrioCandidate(candidates);

    // Detect more than one item that could be the match
    let duplicates = candidates.filter(
      (i: any) =>
        i.getFlag(systemId, documentRqidFlags)?.priority ===
        highestPrioCandidate?.getFlag(systemId, documentRqidFlags)?.priority
    );
    if (duplicates.length > 1) {
      const msg = localize("RQG.RQGSystem.Error.MoreThanOneRqidMatchInCompendia", {
        rqid: rqid,
        lang: lang,
        priority: highestPrioCandidate?.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", duplicates);
    }
    return highestPrioCandidate;
  }

  private static getHighestPrioCandidate<T extends Document<any, any>>(
    candidates: T[]
  ): T | undefined {
    if (candidates.length === 0) {
      return undefined;
    }

    return candidates.reduce((max: T, obj: T) => {
      const maxFlags = (max as T).getFlag(systemId, documentRqidFlags) as
        | DocumentRqidFlags
        | undefined; // TODO Typing didn't work with generics
      const objFlags = (obj as T).getFlag(systemId, documentRqidFlags) as
        | DocumentRqidFlags
        | undefined;
      return (maxFlags?.priority ?? 0) > (objFlags?.priority ?? 0) ? max : obj;
    });
  }

  /**
   *   Translates the first part of a rqid to what those documents are called in the `game` object.
   */
  private static getGameProperty(rqid: string): string {
    const rqidDocument = rqid.split(".")[0];
    const gameProperty = Rqid.gamePropertyLookup[rqidDocument];
    if (!gameProperty) {
      const msg = "Tried to convert rqid with non existing document type";
      throw new RqgError(msg, rqid);
    }
    return gameProperty;
  }

  private static readonly gamePropertyLookup: { [key: string]: string } = {
    a: "actors",
    c: "cards",
    f: "folders",
    i: "items",
    je: "journal",
    m: "macros",
    p: "playlists",
    rt: "tables",
    s: "scenes",
  };

  /**
   *   Translates the first part of a rqid to a document type (like "RqgItem").
   */
  private static getDocumentType(rqid: string): string {
    const rqidDocument = rqid.split(".")[0];
    const documentType = Rqid.documentLookup[rqidDocument];
    if (!documentType) {
      const msg = "Tried to convert rqid with non existing document type";
      throw new RqgError(msg, rqid);
    }
    return documentType;
  }

  private static readonly documentLookup: { [key: string]: string } = {
    a: "RqgActor",
    c: "Card",
    f: "Folder",
    i: "RqgItem",
    je: "JournalEntry",
    m: "Macro",
    p: "Playlist",
    rt: "RollTable",
    s: "Scene",
  };

  /**
   * Get the first part of a rqid (like "i") from a Document.
   */
  private static getRqidDocumentString(document: Document<any, any>): string {
    const clsName =
      (getDocumentClass(document.documentName) as unknown as Document<any, any>).name ?? "";
    const documentString = Rqid.rqidDocumentStringLookup[clsName];
    if (!documentString) {
      const msg = "Tried to convert a unsupported document to rqid";
      throw new RqgError(msg, document);
    }
    return documentString;
  }

  /**
   *  Reverse lookup from DocumentType to rqidDocument ("RqgItem" -> "i").
   */
  private static readonly rqidDocumentStringLookup: { [key: string]: string } = Object.entries(
    Rqid.documentLookup
  ).reduce((acc: { [k: string]: string }, [key, value]) => ({ ...acc, [value]: key }), {});
}

export async function getActorTemplates(): Promise<RqgActor[] | undefined> {
  // TODO: Option 1: Find by rqid with "-template" in the rqid and of type Actor?
  // TODO: Option 2: Make a configurable world folder, and look there first, otherwise look in configurable compendium
  const speciesTemplatesCompendium = getGame().packs.get("rqg.species-templates");
  const templates = await speciesTemplatesCompendium?.getDocuments();
  if (templates) {
    return templates as RqgActor[];
  } else {
    return undefined;
  }
}

export async function getHomelands(): Promise<RqgItem[] | undefined> {
  // get all rqids of homelands
  let homelandRqids: string[] = [];

  const worldHomelandRqids =
    getGame()
      .items?.filter((h) => h.type === ItemTypeEnum.Homeland)
      .map((h) => h.getFlag(systemId, documentRqidFlags)?.id)
      .filter((h): h is string => !!h) ?? [];

  getGame().packs.forEach((p) => {
    p.forEach((h) => {
      if (h instanceof Homeland) {
        const rqid = (h as RqgItem).getFlag(systemId, documentRqidFlags)?.id;
        !!rqid && homelandRqids.push(rqid);
      }
    });
  });

  worldHomelandRqids?.forEach((h) => homelandRqids.push(h));

  // get distinct rqids
  homelandRqids = [...new Set(homelandRqids)];

  // get the best version of each homeland by rqid
  const result: RqgItem[] = [];

  for (const rqid of homelandRqids) {
    const homeland = await Rqid.fromRqid(rqid);
    if (homeland && hasProperty(homeland, "type")) {
      if ((homeland as RqgItem).type === ItemTypeEnum.Homeland) {
        result.push(homeland as RqgItem);
      }
    }
  }

  return result;
}
