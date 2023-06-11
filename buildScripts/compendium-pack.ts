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

export const PackError = (message: string) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

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
      (pack) => path.basename(pack.path) === path.basename(packName)
    );
    if (!metadata && !isTemplate) {
      // Don't care about the template packs, only warn about missing translated pack specifications
      throw PackError(
        `Compendium at ${packDir} has no metadata in the "packs" section in the system.json manifest file.`
      );
    }

    this.systemId = metadata?.system ?? "";
    this.name = metadata?.name ?? "";
    this.documentType = metadata?.type ?? "";

    if (!this.isPackData(parsedData)) {
      throw PackError(
        `Data supplied for [${this.name}] in [${packDir}] does not resemble Foundry document source data.`
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
            throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
          }
        }
      })();

      return packSources;
    });

    const dbFilename = path.basename(dirPath);
    return new CompendiumPack(dbFilename, parsedData.flat(), true);
  }

  private finalize(docSource: CompendiumSource) {
    if (!docSource._id) {
      docSource._id = crypto
        .createHash("md5")
        .update(this.name + docSource.name) // Has to be unique - use the pack and document name (like "cults-enOrlanth")
        .digest("base64")
        .replace(/[\+=\/]/g, "")
        .substring(0, 16);
    }
    return JSON.stringify(docSource);
  }

  /**
   * Create a translated clone of this template CompendiumPack by replacing `${{key}}$` with the translations for that key & lang
   */
  translate(lang: string): CompendiumPack {
    let localizationMatchCount = 0;
    // Include the filename in path to match the behaviour in starter set
    const dictionary = translationsFileNames.reduce((dict: any, filename: string) => {
      dict[filename] = JSON.parse(fs.readFileSync(`${i18nDir}/${lang}/${filename}.json`, "utf8"));
      return dict;
    }, {});

    const localisedPackDir = `${this.packDir}-${lang}.db`;
    const localisedData = this.data.map((d) => {
      const translated = JSON.stringify(d).replace(
        /\$\{\{ ?([\w-.]+) ?\}\}\$/g,
        function (match: string, key: string) {
          const translation = lookup(dictionary, key);

          if (translation == null) {
            console.error(match, "translation key missing in language", lang);
          } else {
            localizationMatchCount++;
          }

          return translation ?? match;
        }
      );
      try {
        const parsed = JSON.parse(translated);

        return parsed;
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Unable to parse translated JSON ${translated}\n\n${error.message}`);
        }
      }
    });

    const translatedPack = new CompendiumPack(localisedPackDir, localisedData, false); // clone this CompendiumPack
    return translatedPack;
  }

  save(): number {
    fs.writeFileSync(
      path.resolve(outDir, this.packDir),
      this.data
        .map((datum) => this.finalize(datum))
        .join("\n")
        .concat("\n")
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
      throw PackError(
        `Document source [${(maybeDocSource as any)?.name}] in (${
          this.name
        }) has invalid or missing keys: ${failedChecks.join(", ")}`
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
 * @param {obj} dict dictionary object
 * @return {string} translated text
 */
function lookup(dict: any, key: string): string {
  const keyParts = key.split(".");

  const value = keyParts.reduce(function (acc, keyPart) {
    return (acc || {})[keyPart];
  }, dict);

  return value;
}

export function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function includePackYaml(yamlString: string): string {
  const tokenRegex = /\"\|{{\s*([\w+.\/-]+)\s+([\w.-]+)\s+\[\s+([^\[]*)?\]\s*}}\|\"/gm;

  const match = yamlString.match(tokenRegex);

  const yaml = yamlString.replace(tokenRegex, function (match: string, ...args) {
    const packName = args[0];
    const rqid = args[1];
    const overrides = args[2]?.split(",").map((item: string) => item.trim());

    const packTemplate = path.resolve(packTemplateDir + "/" + packName);

    const packTemplateYamlString = fs.readFileSync(packTemplate, "utf-8");

    const packEntries = packTemplateYamlString.split("---");

    for (const entry of packEntries) {
      const rqidRegex = new RegExp(`^\\s*id:\\s+${escapeRegex(rqid)}$`, "m");
      if (entry.match(rqidRegex)) {
        // Add two spaces to every line to indent it properly
        let cleanEntry = entry.replace(/\r/, "").replace(/[\n]/gm, "\n  ");

        if (overrides) {
          for (const override of overrides) {
            const split = override.split(":").map((item: string) => item.trim());
            const overrideRegex = new RegExp(`(${escapeRegex(split[0])}:\\s*)(.+)`, "m");
            cleanEntry = cleanEntry.replace(overrideRegex, function (match: string, ...args) {
              const overridden = args[0] + split[1];
              return overridden;
            });
          }
        }

        return cleanEntry;
      }
    }

    // Didn't find an entry
    console.error(
      `Did not find an entry in the pack ${packName} with an RQID of ${rqid} to match the token ${match}`
    );

    return "";
  });

  return yaml;
}
