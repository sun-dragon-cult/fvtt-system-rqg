import { Homeland } from "../../actors/item-specific/homeland";
import { RqgActor } from "../../actors/rqgActor";
import { ArmorDataSource } from "../../data-model/item-data/armorData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillDataSource } from "../../data-model/item-data/skillData";
import { RqgItem } from "../../items/rqgItem";
import { RQG_CONFIG } from "../config";
import { getGame, localize, toKebabCase } from "../util";

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

    if (rqid.startsWith(RQG_CONFIG.rqidPrefixes.item)) {
      return this.itemFromRqid(rqid, lang);
    }

    if (rqid.startsWith(RQG_CONFIG.rqidPrefixes.journalEntry)) {
      return this.journalFromRqid(rqid, lang);
    }

    if (rqid.startsWith(RQG_CONFIG.rqidPrefixes.rollTable)) {
      return this.rollTableFromRqid(rqid, lang);
    }
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
      (i) => i.data.data.rqid === rqid && i.data.data.rqidLang === lang
    );

    if (candidates === undefined) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = candidates.reduce((max, obj) =>
        max.data.data.rqidPriority > obj.data.data.rqidPriority ? max : obj
      );

      // Detect more than one item that could be the match
      let duplicates = candidates.filter(
        (i) => i.data.data.rqidPriority === result.data.data.rqidPriority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
          rqid: rqid,
          rqidLang: lang,
          rqidPriority: result.data.data.rqidPriority,
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result as RqgItem;
    } else {
      return undefined;
    }
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
        for (const item of await pack.getDocuments()) {
          if (item.data.data.rqid === rqid && item.data.data.rqidLang === lang) {
            candidates.push(item as RqgItem);
          }
        }
      }
    }
    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = candidates.reduce((max, obj) =>
        max.data.data.rqidPriority > obj.data.data.rqidPriority ? max : obj
      );

      // Detect more than one item that could be the match
      let duplicates = candidates.filter(
        (i) => i.data.data.rqidPriority === result.data.data.rqidPriority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
          rqid: rqid,
          rqidLang: lang,
          rqidPriority: result.data.data.rqidPriority,
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
    rqid: string,
    lang: string = "en"
  ): Promise<JournalEntry | undefined> {
    if (!rqid) {
      return undefined;
    }

    const worldJournal = await Rqid.journalFromWorldRqid(rqid, lang);

    if (worldJournal !== undefined) {
      return worldJournal;
    }

    const compendiumJournal = await Rqid.journalFromAllCompendiaRqid(rqid, lang);

    if (compendiumJournal !== undefined) {
      return compendiumJournal;
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

  private static async journalFromWorldRqid(
    rqid: string,
    lang: string = "en"
  ): Promise<JournalEntry | undefined> {
    if (!rqid) {
      return undefined;
    }

    const candidates = getGame().journal?.contents.filter(
      //@ts-ignore flags.rqg
      (i) => i.data.flags?.rqg?.rqid === rqid && i.data.flags?.rqg?.rqidLang === lang
    );

    if (candidates === undefined) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = candidates.reduce((max, obj) =>
        // @ts-ignore flags.rqg
        max.data.flags?.rqg?.rqidPriority > obj.data.flags?.rqg?.rqidPriority ? max : obj
      );

      // Detect more than one journal that could be the match
      let duplicates = candidates.filter(
        //@ts-ignore flags.rqg
        (i) => i.data.flags?.rqg?.rqidPriority === result.data.flags?.rqg?.rqidPriority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
          rqid: rqid,
          rqidLang: lang,
          //@ts-ignore flags.rqg
          rqidPriority: result.data.flags?.rqg?.rqidPriority,
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result as JournalEntry;
    } else {
      return undefined;
    }
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
    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = candidates.reduce((max, obj) =>
        //@ts-ignore flags.rqg
        max.data.flags?.rqg?.rqidPriority > obj.data.flags?.rqg?.rqidPriority ? max : obj
      );

      // Detect more than one item that could be the match
      let duplicates = candidates.filter(
        //@ts-ignore flags.rqg
        (i) => i.data.flags?.rqg?.rqidPriority === result.data.flags?.rqg?.rqidPriority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
          rqid: rqid,
          rqidLang: lang,
          //@ts-ignore flags.rqg
          rqidPriority: result.data.flags?.rqg?.rqidPriority,
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result;
    } else {
      return undefined;
    }
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
      //@ts-ignore flags.rqg
      (i) => i.data.flags?.rqg?.rqid === rqid && i.data.flags?.rqg?.rqidLang === lang
    );

    if (candidates === undefined) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = candidates.reduce((max, obj) =>
        // @ts-ignore flags.rqg
        max.data.flags?.rqg?.rqidPriority > obj.data.flags?.rqg?.rqidPriority ? max : obj
      );

      // Detect more than one rollTable that could be the match
      let duplicates = candidates.filter(
        //@ts-ignore flags.rqg
        (i) => i.data.flags?.rqg?.rqidPriority === result.data.flags?.rqg?.rqidPriority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
          rqid: rqid,
          rqidLang: lang,
          //@ts-ignore flags.rqg
          rqidPriority: result.data.flags?.rqg?.rqidPriority,
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
        for (const rollTable of await pack.getDocuments()) {
          if (
            rollTable.data.flags?.rqg?.rqid === rqid &&
            rollTable.data.flags?.rqg?.rqidLang === lang
          ) {
            candidates.push(rollTable as RollTable);
          }
        }
      }
    }
    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 0) {
      let result = candidates.reduce((max, obj) =>
        //@ts-ignore flags.rqg
        max.data.flags?.rqg?.rqidPriority > obj.data.flags?.rqg?.rqidPriority ? max : obj
      );

      // Detect more than one item that could be the match
      let duplicates = candidates.filter(
        //@ts-ignore flags.rqg
        (i) => i.data.flags?.rqg?.rqidPriority === result.data.flags?.rqg?.rqidPriority
      );
      if (duplicates.length > 1) {
        const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
          rqid: rqid,
          rqidLang: lang,
          //@ts-ignore flags.rqg
          rqidPriority: result.data.flags?.rqg?.rqidPriority,
        });
        ui.notifications?.error(msg);
        console.log(msg + "  Duplicate items: ", duplicates);
      }
      return result;
    } else {
      return undefined;
    }
  }

  static getDefaultRqid(document: Actor | Item | JournalEntry | Macro | RollTable | Scene): string {
    if (!document.name) {
      return "";
    }

    let result = "";

    if (document instanceof Actor) {
      return RQG_CONFIG.rqidPrefixes.actor + toKebabCase(document.name);
    }

    if (document instanceof Item) {
      const item = document as Item;
      if (item.type === ItemTypeEnum.Skill) {
        const skill = item.data as SkillDataSource;
        if (skill.data.specialization) {
          result = toKebabCase(`${item.type}-${skill.data.skillName}-${skill.data.specialization}`);
        } else {
          result = toKebabCase(`${item.type}-${skill.data.skillName}`);
        }
      }
      if (item.type === ItemTypeEnum.Armor) {
        const armor = item.data as ArmorDataSource;
        if (armor.data.namePrefix) {
          result = toKebabCase(
            `${item.type}-${armor.data.namePrefix}-${armor.data.armorType}-${armor.data.material}`
          );
        } else {
          result = toKebabCase(`${item.type}-${armor.data.armorType}-${armor.data.material}`);
        }
      }

      if (result) {
        return RQG_CONFIG.rqidPrefixes.item + result;
      }

      return RQG_CONFIG.rqidPrefixes.item + toKebabCase(`${item.type}-${item.name}`);
    }

    if (document instanceof JournalEntry) {
      return RQG_CONFIG.rqidPrefixes.journalEntry + toKebabCase(document.name);
    }

    if (document instanceof Macro) {
      return RQG_CONFIG.rqidPrefixes.macro + toKebabCase(document.name);
    }

    if (document instanceof RollTable) {
      return RQG_CONFIG.rqidPrefixes.rollTable + toKebabCase(document.name);
    }

    if (document instanceof Scene) {
      return RQG_CONFIG.rqidPrefixes.scene + toKebabCase(document.name);
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
  let homelandRqids: string[]= [];

  const worldHomelandRqids = getGame().items?.filter(h => h.type === ItemTypeEnum.Homeland)
                  .map(h => h.data.data.rqid);

  
  getGame().packs.forEach(p => {
    p.forEach(h => {
      if (h instanceof Homeland) {
        homelandRqids.push(h.data.data.rqid);
      }
    });
  });

  worldHomelandRqids?.forEach(h => homelandRqids.push(h));

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