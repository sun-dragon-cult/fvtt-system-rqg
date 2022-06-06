import { Homeland } from "../../actors/item-specific/homeland";
import { RqgActor } from "../../actors/rqgActor";
import { ArmorDataSource } from "../../data-model/item-data/armorData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillDataSource } from "../../data-model/item-data/skillData";
import { RqgItem } from "../../items/rqgItem";
import { RQG_CONFIG, systemId } from "../config";
import { getGame, localize, toKebabCase, trimChars } from "../util";
import { documentRqidFlags, DocumentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";

export class Rqid {
  /**
   * Return the highest priority Document matching the supplied rqid and lang from the Documents in the World. If not
   * found return the highest priority Document matching the supplied rqid and lang from the installed Compendia.
   */
  static async fromRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<RqgItem | JournalEntry | RollTable | undefined> {
    if (!rqid) {
      return undefined;
    }

    if (rqid.startsWith(RQG_CONFIG.rqid.prefixes.item)) {
      return this.itemFromRqid(rqid, lang);
    }

    if (rqid.startsWith(RQG_CONFIG.rqid.prefixes.journalEntry)) {
      return this.journalFromRqid(rqid, lang);
    }

    if (rqid.startsWith(RQG_CONFIG.rqid.prefixes.rollTable)) {
      return this.rollTableFromRqid(rqid, lang);
    }

    console.warn("fromRqid called with unknown prefix", rqid);
  }

  static async itemFromRqid(rqid: string, lang: string = "en"): Promise<RqgItem | undefined> {
    if (!rqid) {
      return undefined;
    }

    const worldItem = await Rqid.itemFromWorldRqid(rqid, lang);

    if (worldItem !== undefined) {
      return worldItem;
    }

    const compendiumItem = await Rqid.itemFromAllCompendiaRqid(rqid, lang);

    if (compendiumItem !== undefined) {
      return compendiumItem;
    } else {
      const msg = localize("RQG.Item.RqgItem.Error.ItemNotFoundByRqid", {
        rqid: rqid,
        rqidLang: lang,
      });
      ui.notifications?.warn(msg);
      console.log(msg);
    }

    return undefined;
  }

  private static async itemFromWorldRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<RqgItem | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates = getGame().items?.contents.filter(
      (i) =>
        i.getFlag(systemId, documentRqidFlags)?.id === rqid &&
        i.getFlag(systemId, documentRqidFlags)?.lang === lang
    );

    if (candidates === undefined) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = this.getHighestPrioCandidate(candidates);

      // Detect more than one item that could be the match
      let duplicates = candidates.filter(
        (i) =>
          i.getFlag(systemId, documentRqidFlags)?.priority ===
          result?.getFlag(systemId, documentRqidFlags)?.priority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
          rqid: rqid,
          rqidLang: lang,
          rqidPriority: result?.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result as RqgItem;
    } else {
      return undefined;
    }
  }

  private static getHighestPrioCandidate<T extends RqgItem | JournalEntry | RollTable>(
    candidates: T[]
  ): T | undefined {
    if (candidates.length === 0) {
      return undefined;
    }

    return candidates.reduce((max: T, obj: T) => {
      const maxFlags = (max as T).getFlag(systemId, documentRqidFlags) as DocumentRqidFlags; // TODO Typing didn't work with generics
      const objFlags = (obj as T).getFlag(systemId, documentRqidFlags) as DocumentRqidFlags;
      return (maxFlags?.priority ?? 0) > (objFlags?.priority ?? 0) ? max : obj;
    });
  }

  private static async itemFromAllCompendiaRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<RqgItem | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates: RqgItem[] = [];

    for (const pack of getGame().packs) {
      if (pack.documentClass.name === "RqgItem") {
        for (const item of (await pack.getDocuments()) as StoredDocument<RqgItem>[]) {
          const itemRqidFlags = item.getFlag(systemId, documentRqidFlags);
          if (itemRqidFlags?.id === rqid && itemRqidFlags?.lang === lang) {
            candidates.push(item);
          }
        }
      }
    }
    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = this.getHighestPrioCandidate(candidates);

      // Detect more than one item that could be the match
      let duplicates = candidates.filter(
        (i) =>
          i.getFlag(systemId, documentRqidFlags)?.priority ===
          result?.getFlag(systemId, documentRqidFlags)?.priority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
          rqid: rqid,
          rqidLang: lang,
          rqidPriority: result?.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result;
    } else {
      return undefined;
    }
  }

  static async journalFromRqid(
    rqid: string | undefined,
    lang: string = "en"
  ): Promise<JournalEntry | undefined> {
    if (!rqid) {
      return;
    }

    const worldJournal = Rqid.journalFromWorldRqid(rqid, lang);
    if (worldJournal) {
      return worldJournal;
    }

    const compendiumJournal = await Rqid.journalFromAllCompendiaRqid(rqid, lang);
    if (compendiumJournal) {
      return compendiumJournal;
    }

    const msg = localize("RQG.Item.RqgItem.Error.ItemNotFoundByRqid", {
      rqid: rqid,
      rqidLang: lang,
    });
    ui.notifications?.warn(msg);
    console.log(msg);
  }

  private static journalFromWorldRqid(rqid: string, lang: string = "en"): JournalEntry | undefined {
    if (!rqid) {
      return undefined;
    }

    const candidates = getGame().journal?.contents.filter(
      (i) =>
        i.getFlag(systemId, documentRqidFlags)?.id === rqid &&
        i.getFlag(systemId, documentRqidFlags)?.lang === lang
    );

    if (!candidates || candidates.length === 0) {
      return undefined;
    }

    let result = this.getHighestPrioCandidate(candidates);

    // Detect more than one journal that could be the match
    let duplicates = candidates.filter(
      (i) =>
        i.getFlag(systemId, documentRqidFlags)?.priority ===
        result?.getFlag(systemId, documentRqidFlags)?.priority
    );
    if (duplicates.length > 1) {
      const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
        rqid: rqid,
        rqidLang: lang,
        rqidPriority: result?.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", duplicates);
    }
    return result as JournalEntry;
  }

  private static async journalFromAllCompendiaRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<JournalEntry | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates: JournalEntry[] = [];

    for (const pack of getGame().packs) {
      if (pack.documentClass.name === "JournalEntry") {
        for (const journal of await pack.getDocuments()) {
          if (
            journal.data.flags?.rqg?.rqid === rqid &&
            journal.data.flags?.rqg?.rqidLang === lang
          ) {
            candidates.push(journal as JournalEntry);
          }
        }
      }
    }

    const result = this.getHighestPrioCandidate(candidates);
    if (!result) {
      return undefined;
    }

    // Detect more than one item that could be the match
    let duplicates = candidates.filter(
      (i) =>
        i.getFlag(systemId, documentRqidFlags)?.priority ===
        result.getFlag(systemId, documentRqidFlags)?.priority
    );
    if (duplicates.length > 1) {
      const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
        rqid: rqid,
        rqidLang: lang,
        rqidPriority: result.getFlag(systemId, documentRqidFlags)?.priority ?? "---",
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", duplicates);
    }
    return result;
  }

  static async rollTableFromRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<RollTable | undefined> {
    if (!rqid) {
      return undefined;
    }

    const worldRollTable = await Rqid.rollTableFromWorldRqid(rqid, lang);

    if (worldRollTable !== undefined) {
      return worldRollTable;
    }

    const compendiumRollTable = await Rqid.rollTableFromAllCompendiaRqid(rqid, lang);

    if (compendiumRollTable !== undefined) {
      return compendiumRollTable;
    } else {
      const msg = localize("RQG.Item.RqgItem.Error.ItemNotFoundByRqid", {
        rqid: rqid,
        rqidLang: lang,
      });
      ui.notifications?.warn(msg);
      console.log(msg);
    }

    return undefined;
  }

  private static async rollTableFromWorldRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<RollTable | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates = getGame().tables?.contents.filter(
      (rt) =>
        rt.getFlag(systemId, documentRqidFlags)?.id === rqid &&
        rt.getFlag(systemId, documentRqidFlags)?.lang === lang
    );

    if (candidates === undefined) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = this.getHighestPrioCandidate(candidates);

      // Detect more than one rollTable that could be the match
      let duplicates = candidates.filter(
        (rt) =>
          rt.getFlag(systemId, documentRqidFlags)?.priority ===
          result?.getFlag(systemId, documentRqidFlags)?.priority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
          rqid: rqid,
          rqidLang: lang,

          rqidPriority: result?.getFlag(systemId, documentRqidFlags)?.priority,
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result as RollTable;
    } else {
      return undefined;
    }
  }

  private static async rollTableFromAllCompendiaRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<RollTable | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates: RollTable[] = [];

    for (const pack of getGame().packs) {
      if (pack.documentClass.name === "RollTable") {
        const rollTablePackDocuments = (await pack.getDocuments()) as StoredDocument<RollTable>[];
        for (const rollTable of rollTablePackDocuments) {
          if (
            rollTable.getFlag(systemId, documentRqidFlags)?.id === rqid &&
            rollTable.getFlag(systemId, documentRqidFlags)?.lang === lang
          ) {
            candidates.push(rollTable as RollTable);
          }
        }
      }
    }
    if (candidates.length === 0) {
      return undefined;
    }

    let result = this.getHighestPrioCandidate(candidates);
    if (!result) {
      return;
    }
    // TODO Typing not working for RollTable?
    const resultFlags: DocumentRqidFlags | undefined = result?.getFlag(systemId, documentRqidFlags);

    // Detect more than one item that could be the match
    let duplicates = candidates.filter(
      (i) => i.getFlag(systemId, documentRqidFlags)?.priority === resultFlags?.priority
    );
    if (duplicates.length > 1) {
      const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
        rqid: rqid,
        rqidLang: lang,
        rqidPriority: resultFlags?.priority,
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", duplicates);
    }
    return result;
  }

  static getDefaultRqid(document: Actor | Item | JournalEntry | Macro | RollTable | Scene): string {
    if (!document.name) {
      return "";
    }

    let result = "";

    if (document instanceof Actor) {
      return (
        RQG_CONFIG.rqid.prefixes.actor +
        toKebabCase(document.type) +
        "." +
        toKebabCase(document.name)
      );
    }

    if (document instanceof Item) {
      const item = document as Item;
      if (item.type === ItemTypeEnum.Skill) {
        const skill = item.data as SkillDataSource;
        result = trimChars(
          toKebabCase(`${skill.data.skillName}-${skill.data.specialization}`),
          "-"
        );
      }
      if (item.type === ItemTypeEnum.Armor) {
        const armor = item.data as ArmorDataSource;
        result = trimChars(
          toKebabCase(`${armor.data.namePrefix}-${armor.data.armorType}-${armor.data.material}`),
          "-"
        );
      }

      if (result) {
        return RQG_CONFIG.rqid.prefixes.item + toKebabCase(item.type) + "." + result;
      }

      return RQG_CONFIG.rqid.prefixes.item + toKebabCase(item.type) + "." + toKebabCase(item.name!);
    }

    if (document instanceof JournalEntry) {
      return RQG_CONFIG.rqid.prefixes.journalEntry + "." + toKebabCase(document.name);
    }

    if (document instanceof Macro) {
      return RQG_CONFIG.rqid.prefixes.macro + "." + toKebabCase(document.name);
    }

    if (document instanceof RollTable) {
      return RQG_CONFIG.rqid.prefixes.rollTable + "." + toKebabCase(document.name);
    }

    if (document instanceof Scene) {
      return RQG_CONFIG.rqid.prefixes.scene + "." + toKebabCase(document.name);
    }

    return "";
  }

  static async renderRqidDocument(rqid: string) {
    const document = await Rqid.fromRqid(rqid);
    document?.sheet?.render(true);
  }
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
