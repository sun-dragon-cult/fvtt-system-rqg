import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as crypto from "crypto";
import { i18nDir } from "./buildPacks";
import { lookup } from "./translate";

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

// const localeDictionarys = fs.readdirSync(I18N_DIR).filter((file) => {
//   return fs.statSync(path.join(I18N_DIR, file)).isDirectory();
// });

type CompendiumSource = any["data"]["_source"];

export class CompendiumPack {
  name: string;
  packDir: string;
  documentType: string;
  systemId: string;
  data: any[];

  static outDir = path.resolve(process.cwd(), "src/assets/packs");
  // private static namesToIds = new Map<string, Map<string, string>>();
  private static packsMetadata = JSON.parse(
    fs.readFileSync(path.resolve("./src/system.json"), "utf-8")
  ).packs as PackMetadata[];

  constructor(packDir: string, parsedData: unknown[], template: boolean = true) {
    const metadata = CompendiumPack.packsMetadata.find(
      (pack) => path.basename(pack.path) === path.basename(packDir)
    );
    if (metadata === undefined && !template) {
      // Don't care about the template packs, only warn about missing translated pack specifications
      throw PackError(`Compendium at ${packDir} has no metadata in the local system.json file.`);
    }

    this.systemId = metadata?.system ?? "";
    this.name = metadata?.name ?? "";
    this.documentType = metadata?.type ?? "";

    if (!this.isPackData(parsedData)) {
      throw PackError(
        `Data supplied for ${this.name} does not resemble Foundry document source data.`
      );
    }

    this.packDir = packDir;

    // CompendiumPack.namesToIds.set(this.name, new Map());
    // const packMap = CompendiumPack.namesToIds.get(this.name);
    // if (!packMap) {
    //   throw PackError(`Compendium ${this.name} (${packDir}) was not found.`);
    // }

    parsedData = parsedData.map((d) => {
      // Generate new ids everytime we rebuild TODO didn't do this before - any downsides?
      d._id = crypto
        .createHash("md5")
        .update(d.name)
        .digest("base64")
        .replace(/[\+=\/]/g, "")
        .substring(0, 16);
      return d;
    });

    this.data = parsedData;
  }

  static loadYAML(dirPath: string): CompendiumPack {
    // if (!dirPath.replace(/\/$/, "").endsWith(".db")) {
    //   const dirName = path.basename(dirPath);
    //   throw PackError(`JSON directory (${dirName}) does not end in ".db"`);
    // }

    const filenames = fs.readdirSync(dirPath);
    const filePaths = filenames.map((filename) => path.resolve(dirPath, filename));
    const parsedData: unknown[] = filePaths.map((filePath) => {
      const yamlString = fs.readFileSync(filePath, "utf-8");
      const packSources: CompendiumSource = (() => {
        try {
          return yaml.loadAll(yamlString);
        } catch (error) {
          if (error instanceof Error) {
            throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
          }
        }
      })();

      return packSources;
    });

    const dbFilename = path.basename(dirPath);
    return new CompendiumPack(dbFilename, parsedData.flat(), undefined);
  }

  private finalize(docSource: CompendiumSource) {
    return JSON.stringify(docSource);
  }

  /**
   * Create a translated clone of this template CompendiumPack by replacing `${{key}}$` with the translations for that key & lang
   */
  translate(lang: string): CompendiumPack {
    let localizationMatchCount = 0;
    const dictionary = JSON.parse(fs.readFileSync(`${i18nDir}/${lang}/system.json`, "utf8"));
    const localisedPackDir = `${this.packDir}-${lang}.db`;
    const localisedData = this.data.map((d) =>
      JSON.parse(
        JSON.stringify(d).replace(
          /\$\{\{ ?([\w-.]+) ?\}\}\$/g,
          function (match: string, key: string) {
            const translation = lookup(dictionary, key);

            if (!translation) {
              console.error(match, "translation key missing in language", lang);
              // errors.push([match, "translation missing in", locale]);
            } else {
              localizationMatchCount++;
            }

            return translation ?? match;
          }
        )
      )
    );

    const translatedPack = new CompendiumPack(localisedPackDir, localisedData, false); // clone this CompendiumPack
    return translatedPack;
  }

  save(): number {
    fs.writeFileSync(
      path.resolve(CompendiumPack.outDir, this.packDir),
      this.data
        .map((datum) => this.finalize(datum))
        // TODO Add translate step here?
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
      // flags: (data: unknown) => typeof data === "object" && data !== null && "flags" in data,
      permission: (data: { permission?: { default: unknown } }) =>
        !data.permission ||
        (typeof data.permission === "object" &&
          data.permission !== null &&
          Object.keys(data.permission).length === 1 &&
          Number.isInteger(data.permission.default)),
    });

    const failedChecks = checks
      .map(([key, check]) => (check(maybeDocSource as any) ? null : key))
      .filter((key) => key !== null);

    if (failedChecks.length > 0) {
      throw PackError(
        `Document source in (${this.name}) has invalid or missing keys: ${failedChecks.join(", ")}`
      );
    }

    return true;
  }

  private isPackData(packData: unknown[]): packData is CompendiumSource[] {
    return packData.every((maybeDocSource: unknown) => this.isDocumentSource(maybeDocSource));
  }
}

export function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}
