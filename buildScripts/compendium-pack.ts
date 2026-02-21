import chalk from "chalk";
import classicLevelPkg from "classic-level";
import type { ChainedBatch } from "classic-level";
import * as fs from "fs";
import { existsSync, promises } from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as crypto from "crypto";
import { config, getPackOutDir, packsMetadata } from "./buildPacks.ts";
import { doTranslation, isObject, setProperty, tryOrThrow } from "./utils.ts";
import { PackError } from "./packError.ts";

const { ClassicLevel } = classicLevelPkg as {
  ClassicLevel: typeof import("classic-level").ClassicLevel;
};

type ImportData = {
  _importExternalDocument: {
    file: string;
    rqid: string;
    overrides: [
      {
        path: string;
        value: string;
      },
    ];
  };
};

type Document = any["items"]; // TODO improve

export interface PackMetadata {
  system: string;
  name: string;
  path: string;
  type: string;
}

type CompendiumSource = any["data"]["_source"]; // TODO *** remove or redefine type ***

export class CompendiumPack {
  name: string;
  packDir: string;
  documentType: string;
  systemId: string;
  data: Document[];
  language: string | undefined;

  constructor(packDir: string, parsedData: unknown[], isTemplate: boolean, language?: string) {
    const metadata = packsMetadata.find(
      (pack) => path.basename(pack.path) === path.basename(packDir),
    );
    if (!metadata && !isTemplate) {
      // Don't care about the template packs, only warn about missing translated pack specifications
      throw new PackError(
        `Compendium at ${packDir} has no metadata in the "packs" section in the system.json manifest file.`,
      );
    }
    this.language = language;
    this.systemId = metadata?.system ?? "";
    this.name = metadata?.name ?? "";
    this.documentType = metadata?.type ?? "";

    if (!this.isPackData(parsedData)) {
      throw new PackError(
        `Data supplied for [${this.name}] in [${packDir}] does not resemble Foundry document source data.`,
      );
    }

    this.packDir = packDir;
    this.data = parsedData;
  }

  /**
   * Factory to create a CompendiumPack from a path to a pack-templates folder
   */
  static loadYAML(dirPath: string): CompendiumPack {
    console.log(chalk.green(`Building pack from ${chalk.bold(dirPath)}/*.yaml`));
    const filenames = fs.readdirSync(dirPath);
    const filePaths = filenames.map((filename) => path.resolve(dirPath, filename));
    const parsedData: unknown[] = filePaths.map((filePath: string) =>
      this.parseYamlFileData(filePath),
    );

    const dbFilename = path.basename(dirPath);
    return new CompendiumPack(dbFilename, parsedData.flat(Infinity), true);
  }

  private static parseYamlFileData(filePath: string) {
    const yamlString = fs.readFileSync(filePath, "utf-8");
    const documentsToBeEnriched = tryOrThrow<Document[]>(
      () => yaml.loadAll(yamlString),
      (e) => {
        throw new PackError(
          `Error in includePackYaml [${e}] when loading yamlString:\n${yamlString}`,
        );
      },
    );

    return tryOrThrow(
      () => resolveExternalImports(documentsToBeEnriched),
      (e) => {
        throw new PackError(
          `Got error ${e} while resolving external imports ${documentsToBeEnriched}`,
        );
      },
    );
  }

  private finalize(docSource: CompendiumSource, batch: ChainedBatch<ClassicLevel, string, string>) {
    const documentType2dbType = new Map([
      ["Actor", "!actors"],
      ["Item", "!items"],
      ["JournalEntry", "!journal"],
      ["RollTable", "!tables"],
      ["Macro", "!macros"],
    ]);

    const dbType = documentType2dbType.get(this.documentType);
    if (!dbType) {
      throw new PackError(`Document type ${this.documentType} is unknown`);
    }
    docSource = this.addId(docSource, dbType + "!");

    // Add _id to Descendant Documents
    if (docSource.items) {
      // child of Actor
      docSource.items = docSource.items.map((item: any) => {
        this.addId(item, `${dbType}.items!`, docSource._id);
        batch.put(item._key, item);
        return item._id;
      });
    }
    if (docSource.effects) {
      // child of Item etc.
      docSource.effects = docSource.effects.map((effect: any) => {
        this.addId(effect, `${dbType}.effects!`, docSource._id);
        batch.put(effect._key, effect);
        return effect._id;
      });
    }
    if (docSource.pages) {
      // child of RollTable
      docSource.pages = docSource.pages.map((page: any) => {
        this.addId(page, `${dbType}.pages!`, docSource._id);
        batch.put(page._key, page);
        return page._id;
      }); // Updates in place in docSource
    }
    if (docSource.results) {
      // child of RollTable
      docSource.results = docSource.results.map((result: any) => {
        this.addId(result, `${dbType}.results!`, docSource._id);
        batch.put(result._key, result);
        return result._id;
      });
    }

    batch.put(docSource._key, docSource); //add it to the DB transaction
  }

  /**
   * Create a db id that is the same every time for the same document, by using a hash
   * of compendium name + document.name + document.type + document.text
   */
  private addId(document: Document, dbLocation: string, parentId?: string): Document {
    const currentObjectId: string =
      document._id ??
      crypto
        .createHash("md5")
        .update(this.name + document.name + document.type + document.text) // Has to be unique - use data that should be unique when combined (like "cults | en - Orlanth - cult - undefined")
        .digest("base64")
        .replace(/[+=/]/g, "")
        .substring(0, 16);
    document._id = currentObjectId;
    const parentObjectId = parentId ? `${parentId}.` : "";
    document._key = dbLocation + parentObjectId + currentObjectId;
    return document;
  }

  /**
   * Create a translated clone of this template CompendiumPack by replacing `${{key}}$` with the translations for that key & lang
   */
  translate(lang: string): CompendiumPack {
    // Include the filename in path to match the behaviour in starter set
    const localisedData = doTranslation(lang, this.data);

    // clone this CompendiumPack
    return new CompendiumPack(this.packDir, localisedData.flat(Infinity), false, lang);
  }

  /**
   * Save the CompendiumPack to the db.
   *
   * Return the number of documents in the CompendiumPack.
   */
  async save(): Promise<number> {
    const langPackOutPath = getPackOutDir();
    //create DB and grab a transaction
    const dbPath = path.join(langPackOutPath, this.packDir);
    const db = new ClassicLevel(dbPath, { keyEncoding: "utf8", valueEncoding: "json" });
    const batch = db.batch();

    //attempt to clear the DB files if they already exist.
    if (existsSync(dbPath)) {
      await promises.rm(dbPath, { recursive: true });
    }

    for (const doc of this.data) {
      this.finalize(doc, batch);
    }

    //commit and close the DB
    await batch.write();
    await _compactClassicLevel(db);
    await db.close();
    console.log(
      chalk.green(
        `Wrote ${chalk.bold(this.name)} in ${chalk.bold(this.language)} with ${chalk.bold(
          this.data.length,
        )} entries to db!`,
      ),
    );

    return this.data.length;
  }

  private isDocumentSource(maybeDocSource: unknown): maybeDocSource is CompendiumSource {
    if (!isObject(maybeDocSource)) {
      return false;
    }
    const checks = Object.entries({
      name: (data: { name?: unknown }) => typeof data.name === "string",
      flags: (data: unknown) => typeof data === "object" && data !== null && "flags" in data,
      ownership: (data: { ownership?: { default?: unknown } }) =>
        !data.ownership ||
        (typeof data.ownership === "object" &&
          Object.keys(data.ownership).length === 1 &&
          Number.isInteger(data.ownership.default)),
    });

    const failedChecks = checks
      .map(([key, check]) => (check(maybeDocSource as any) ? null : key))
      .filter((key) => key !== null);

    if (failedChecks.length > 0) {
      throw new PackError(
        `Document source [${(maybeDocSource as any)?.name}] in (${
          this.name
        }) has invalid or missing keys: ${failedChecks.join(", ")}`,
      );
    }

    return true;
  }

  private isPackData(packData: unknown[]): packData is CompendiumSource[] {
    return packData.every((maybeDocSource: unknown) => this.isDocumentSource(maybeDocSource));
  }
}

function resolveExternalImports(documentsToBeEnriched: Document[]): Document[] {
  documentsToBeEnriched.map((documentToEnrich) => {
    // Look for import metadata in the items list only for now
    documentToEnrich.items = documentToEnrich?.items?.map((embeddedItemObject: ImportData) => {
      if (!embeddedItemObject._importExternalDocument) {
        return embeddedItemObject; // TODO Should I even support embedding items directly, or is this an error?
      }

      const packTemplate = path.resolve(
        config.packTemplateDir,
        embeddedItemObject._importExternalDocument.file,
      );
      const packTemplateYamlString = tryOrThrow(
        () => fs.readFileSync(packTemplate, "utf-8"),
        (e) => {
          throw new PackError(`Error ${e} when reading packTemplate file ${packTemplate}`);
        },
      );
      const packEntries = yaml.loadAll(packTemplateYamlString) as Document[];
      const documentToImport = packEntries.find(
        (entry) =>
          entry?.flags?.rqg?.documentRqidFlags?.id ===
          embeddedItemObject._importExternalDocument.rqid,
      );
      if (!documentToImport) {
        throw new PackError(
          `Did not find an entry in [${chalk.bold(
            embeddedItemObject._importExternalDocument.file,
          )}] with an RQID of [${chalk.bold(embeddedItemObject._importExternalDocument.rqid)}]`,
        );
      }

      for (const override of embeddedItemObject._importExternalDocument?.overrides ?? []) {
        // TODO check if matchingEntry has something in overrideKey already, if not it's probably a mistake
        setProperty(documentToImport, override.path, override.value);
      }
      return documentToImport;
    });
  });

  return documentsToBeEnriched.flat(Infinity);
}

/**
 * Flushes the log of the given database to create compressed binary tables.
 */
async function _compactClassicLevel(db: ClassicLevel<string, string>): Promise<void> {
  const forwardIterator = db.keys({ limit: 1, fillCache: false });
  const firstKey = await forwardIterator.next();
  await forwardIterator.close();

  const backwardIterator = db.keys({ limit: 1, reverse: true, fillCache: false });
  const lastKey = await backwardIterator.next();
  await backwardIterator.close();

  if (firstKey && lastKey) {
    await db.compactRange(firstKey, lastKey, { keyEncoding: "utf8" });
  }
}
