import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as crypto from "crypto";
import { escapeRegex } from "../src/system/util";
import {
  i18nDir,
  outDir,
  packsMetadata,
  packTemplateDir,
  translationsFileNames,
} from "./buildPacks";

export interface PackMetadata {
  system: string;
  name: string;
  path: string;
  type: string;
}

export class PackError implements Error {
  public name: string = "PackError";

  constructor(public message: string) {
    console.error(`Pack Error: ${message}`);
    process.exit(1);
  }
}

type CompendiumSource = any["data"]["_source"];

export class CompendiumPack {
  name: string;
  packDir: string;
  documentType: string;
  systemId: string;
  data: any[];

  constructor(packDir: string, parsedData: unknown[], isTemplate: boolean) {
    const packName = isTemplate ? packDir + "-en.db" : packDir;

    const metadata = packsMetadata.find(
      (pack) => path.basename(pack.path) === path.basename(packName),
    );
    if (!metadata && !isTemplate) {
      // Don't care about the template packs, only warn about missing translated pack specifications
      throw new PackError(
        `Compendium at ${packDir} has no metadata in the "packs" section in the system.json manifest file.`,
      );
    }

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

  static loadYAML(dirPath: string): CompendiumPack {
    const filenames = fs.readdirSync(dirPath);
    const filePaths = filenames.map((filename) => path.resolve(dirPath, filename));
    const parsedData: unknown[] = filePaths.map((filePath) => {
      const yamlString = fs.readFileSync(filePath, "utf-8");
      const yamlStringWithIncludes = includePackYaml(yamlString);
      const packSources: CompendiumSource = (() => {
        try {
          return yaml.loadAll(yamlStringWithIncludes);
        } catch (error) {
          if (error instanceof Error) {
            console.log(yamlStringWithIncludes);
            throw new PackError(`File ${filePath} could not be parsed: ${error.message}`);
          }
        }
      })();

      return packSources;
    });

    const dbFilename = path.basename(dirPath);
    return new CompendiumPack(dbFilename, parsedData.flat(), true);
  }

  private finalize(docSource: CompendiumSource) {
    docSource = this.addId(docSource);

    // Add _id to Descendant Documents
    if (docSource.items) {
      docSource.items = docSource.items.map((page: any) => this.addId(page)); // Updates in place in docSource
    }
    if (docSource.effects) {
      docSource.effects = docSource.effects.map((page: any) => this.addId(page)); // Updates in place in docSource
    }
    if (docSource.pages) {
      docSource.pages = docSource.pages.map((page: any) => this.addId(page)); // Updates in place in docSource
    }
    if (docSource.results) {
      docSource.results = docSource.results.map((page: any) => this.addId(page)); // Updates in place in docSource
    }
    return JSON.stringify(docSource);
  }

  private addId(object: any): any {
    if (!object._id) {
      object._id = crypto
        .createHash("md5")
        .update(this.name + object.name + object.type + object.text) // Has to be unique - use data that should be unique when combined (like "cults | en - Orlanth - cult - undefined")
        .digest("base64")
        .replace(/[+=/]/g, "")
        .substring(0, 16);
    }
    return object;
  }

  /**
   * Create a translated clone of this template CompendiumPack by replacing `${{key}}$` with the translations for that key & lang
   */
  translate(lang: string): CompendiumPack {
    // Include the filename in path to match the behaviour in starter set
    const dictionary = translationsFileNames.reduce((dict: any, filename: string) => {
      dict[filename] = JSON.parse(fs.readFileSync(`${i18nDir}/${lang}/${filename}.json`, "utf8"));
      return dict;
    }, {});

    const localisedPackDir = `${this.packDir}-${lang}.db`;
    const localisedData = this.data.map((d) => {
      const translated = JSON.stringify(d).replace(
        /\$\{\{ ?([\w\-.]+) ?}}\$/g,
        function (match: string, key: string) {
          const translation = lookup(dictionary, key);

          if (translation == null) {
            console.error(match, "translation key missing in language", lang);
          }
          return translation ?? match;
        },
      );
      try {
        return JSON.parse(translated);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Unable to parse translated JSON ${translated}\n\n${error.message}`);
        }
      }
    });

    // clone this CompendiumPack
    return new CompendiumPack(localisedPackDir, localisedData, false);
  }

  save(): number {
    fs.writeFileSync(
      path.resolve(outDir, this.packDir),
      this.data
        .map((datum) => this.finalize(datum))
        .join("\n")
        .concat("\n"),
    );
    console.log(`Pack "${this.name}" with ${this.data.length} entries built successfully.`);

    return this.data.length;
  }

  private isDocumentSource(maybeDocSource: unknown): maybeDocSource is CompendiumSource {
    if (!isObject(maybeDocSource)) return false;
    const checks = Object.entries({
      name: (data: { name?: unknown }) => typeof data.name === "string",
      flags: (data: unknown) => typeof data === "object" && data !== null && "flags" in data,
      permission: (data: { permission?: { default: unknown } }) =>
        !data.permission ||
        (typeof data.permission === "object" &&
          data.permission != null &&
          Object.keys(data.permission).length === 1 &&
          Number.isInteger(data.permission.default)),
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

/**
 * Translate a key given a dictionary.
 * @return {string} translated text
 */
function lookup(dict: any, key: string): string {
  const keyParts = key.split(".");

  const value = keyParts.reduce(function (acc, keyPart) {
    return acc[keyPart];
  }, dict);

  return value;
}

export function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function includePackYaml(yamlString: string): string {
  const tokenRegex =
    /"\|{{\s*(?<packName>[\w+./-]+)\s+(?<rqid>[\w.-]+)\s+\[\s+(?<override>[^[]*)?]\s*}}\|"/gm;

  return yamlString.replace(tokenRegex, replaceLinkedDocs);
}

function replaceLinkedDocs(
  match: string,
  packName: string | undefined,
  rqid: string | undefined,
  override: string | undefined,
): string {
  if (!packName || !rqid) {
    console.error(
      `Missing packName [${packName}] or Rqid [${rqid}] when matching token [${match}]`,
    );
    return "";
  }
  const overrides = override?.split(",").map((item) => item.trim()) ?? [];
  const packTemplate = path.resolve(packTemplateDir + "/" + packName);

  const packTemplateYamlString = packTemplate ? fs.readFileSync(packTemplate, "utf-8") : undefined;
  const packEntries = packTemplateYamlString?.split("---") ?? [];
  const rqidRegex = new RegExp(`^\\s*id:\\s+${escapeRegex(rqid)}$`, "m");

  for (const entry of packEntries) {
    if (entry.match(rqidRegex)) {
      // Add two spaces to every line to indent it properly
      let cleanEntry = entry.replace(/\r/, "").replace(/\n/gm, "\n  ");

      for (const override of overrides) {
        const [overrideKey, overrideValue] = override.split(":").map((item) => item.trim());
        const overrideRegex = new RegExp(`(${escapeRegex(overrideKey)}:\\s*)(.+)`, "m");
        cleanEntry = cleanEntry.replace(overrideRegex, (match, xxx: string) => xxx + overrideValue);
      }
      return cleanEntry;
    }
  }

  // Didn't find an entry
  console.error(
    `Did not find an entry in the pack [${packName}] with an RQID of [${rqid}] to match the token [${match}]`,
  );
  return "";
}
