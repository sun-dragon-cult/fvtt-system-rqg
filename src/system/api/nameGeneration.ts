import Foswig from "foswig";
import { RQG_CONFIG, systemId } from "../config";
import { getGame, localize } from "../util";
import { Rqid } from "./rqidApi";
import { DocumentRqidFlags, documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";

export class nameGeneration {
  static defaultConstraints = {
    minLength: 2,
    maxLength: 10,
    allowDuplicates: true,
    maxAttempts: 25,
  };

  /**
   * Generate one or more names from the RollTable or JournalEntry Name Base referenced in the rqid.
   *
   * Markov Examples:
   *
   * Generate 1 name using the default constraints:
   * ```
   * await game.system.api.names.Generate("je..names-sartarite-female")
   * ```
   * Generate 10 names using the default constraints:
   * ```
   * await game.system.api.names.Generate("je..names-sartarite-female", 10)
   * ```
   * Generate 20 names overriding some of the properties of the default constraints
   * ```
   * await game.system.api.names.Generate("je..names-sartarite-female", 20, {maxAttempts: 5, allowDuplicates: false,})
   * ```
   *
   * RollTable Examples:
   * ```
   * await game.system.api.names.Generate("rt..names-sartarite-male", 20)
   * ```
   */
  static async Generate(
    rqid: string,
    num: number = 1,
    constraints = this.defaultConstraints,
  ): Promise<string[] | undefined> {
    if (!rqid) {
      return undefined;
    }

    if (rqid.startsWith(RQG_CONFIG.rqid.prefixes.journalEntry)) {
      return this.GenerateFromNameBase(rqid, num, constraints);
    }

    if (rqid.startsWith(RQG_CONFIG.rqid.prefixes.rollTable)) {
      // Generate a name from a Roll Table
      return this.GenerateFromRollTable(rqid, num, constraints);
    }

    const msg = localize("RQG.Notification.Warn.NameGenRqidNotSupported", { rqid: rqid });
    console.warn(msg);
    ui.notifications?.warn(msg);

    return undefined;
  }

  static async GenerateFromNameBase(
    rqid: string,
    num: number = 1,
    constraints = this.defaultConstraints,
  ): Promise<string[] | undefined> {
    if (!rqid) {
      return undefined;
    }

    // Generate a name using Foswig
    const nameBase = await this.GetNameBase({ id: rqid });

    if (!nameBase) {
      const msg = localize("RQG.Notification.Warn.NameGenRqidNotFound", { rqid: rqid });
      console.warn(msg);
      ui.notifications?.warn(msg);
      return undefined;
    }

    // properties on the constraints will override defaultConstraints if they exist
    const mergedConstraints = { ...this.defaultConstraints, ...constraints };

    const chain = new Foswig(3, nameBase.names);
    const nameBaseNotLongEnoughMsg = localize("RQG.Notification.Warn.NameBaseNotLongEnough", {
      rqid: rqid,
      attempts: mergedConstraints.maxAttempts,
    });

    const numRolls = num < 1 ? 1 : num;

    const result: string[] = [];
    let warn = false;
    for (let i = 0; i < numRolls; i++) {
      try {
        result.push(chain.generate(mergedConstraints));
      } catch (error) {
        warn = true;
        console.log(nameBaseNotLongEnoughMsg, error);
      }
    }
    if (warn) {
      // Only warn once because the try catch above could fail numerous times
      console.warn(nameBaseNotLongEnoughMsg);
      ui.notifications?.warn(nameBaseNotLongEnoughMsg);
    }
    return result;
  }

  static async GetNameBases(): Promise<Map<string, NameBase> | undefined> {
    const worldRqids = getGame().journal!.reduce((acc: DocumentRqidFlags[], j: JournalEntry) => {
      const rqidFlags = j.getFlag(systemId, documentRqidFlags);
      if (rqidFlags?.id?.startsWith("names-")) {
        acc.push(rqidFlags);
      }
      return acc;
    }, []);

    const compendiumRqids: DocumentRqidFlags[] = [];
    for (const pack of getGame().packs) {
      if (pack.documentClass.name === "JournalEntry") {
        for (const journal of (await pack.getDocuments()) as StoredDocument<JournalEntry>[]) {
          const rqid = journal.getFlag(systemId, documentRqidFlags);
          if (rqid?.id?.startsWith("names-")) {
            compendiumRqids.push(rqid);
          }
        }
      }
    }

    const allRqids = worldRqids
      ?.concat(compendiumRqids)
      .filter((v, i, a) => v !== undefined && a.indexOf(v) === i);

    if (allRqids !== undefined && allRqids.length > 0) {
      const result = new Map<string, NameBase>();
      for (const rqid of allRqids) {
        const nameBase = await this.GetNameBase(rqid);
        if (nameBase !== undefined) {
          result.set(nameBase.rqid, nameBase);
        }
      }
      return result;
    }
    return undefined;
  }

  static async GetNameBase(rqid: DocumentRqidFlags): Promise<NameBase | undefined> {
    const nameJournal = await Rqid.fromRqid(rqid.id, rqid.lang);

    if (!nameJournal) {
      return;
    }

    let names = nameJournal?.data.content;
    // TODO: This could possibly be more robust to allow users to not have to be exact in entering names
    names = names
      ?.replace("<pre>", "")
      .replace("</pre>", "")
      .replace(/<br \/>/gm, "\n");
    const nameArray = names?.split("\n");

    return new NameBase({
      rqid: rqid.id,
      names: nameArray,
    });
  }

  static async GenerateFromRollTable(
    rqid: string,
    num: number = 1,
    constraints = this.defaultConstraints,
  ): Promise<string[] | undefined> {
    if (!rqid) {
      return undefined;
    }

    const nameTable = await Rqid.fromRqid(rqid);

    if (!nameTable) {
      const msg = localize("RQG.Notification.Warn.NameGenRqidNotFound", {
        rqid: rqid,
      });
      console.warn(msg);
      ui.notifications?.warn(msg);
      return undefined;
    }

    const numRolls = num < 1 ? 1 : num;

    const result: string[] = [];

    for (let i = 0; i < numRolls; i++) {
      // @ts-expect-error roll
      const tableResult = await nameTable.roll();
      result.push(await this.ResolveTableResult(tableResult, constraints));
    }

    return result;
  }

  static async ResolveTableResult(
    tableResult: any,
    constraints = this.defaultConstraints,
  ): Promise<string> {
    if (!tableResult.results[0].data.text) {
      return "";
    }

    const tableString: string = tableResult.results[0].data.text;
    let resultString = tableString;
    const regex = /[^{}]+(?=}})/gm; // TODO will match {{abc}} but also {abc}}
    let match;

    while ((match = regex.exec(tableString)) != null) {
      const generatedValue = await this.Generate(match[0], 1, constraints);
      if (generatedValue) {
        resultString = resultString.replace(match[0], generatedValue[0]);
      }
      // If it couldn't generate a message, just leave the token.
      // Error message will have already been displayed.
    }
    return resultString.replaceAll("{{", "").replaceAll("}}", "");
  }
}

class NameBase {
  rqid: string = "";
  names: string[] = [];

  public constructor(init?: Partial<NameBase>) {
    Object.assign(this, init);
  }
}
