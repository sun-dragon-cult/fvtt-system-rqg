import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

import * as crypto from 'crypto'

// import *
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

// export function isActorSource(docSource: any): docSource is any {
// // export function isActorSource(docSource: any): docSource is RqgActor {
//     return "data" in docSource && isObject(docSource.data) && "items" in docSource && Array.isArray(docSource.items);
// }
//
// export function isItemSource(docSource: CompendiumSource): docSource is RqgItem {
//     return "data" in docSource && isObject(docSource.data) && !isActorSource(docSource);
// }

export class CompendiumPack {
    name: string;
    packDir: string;
    documentType: string;
    systemId: string;
    data: any[];

    static outDir = path.resolve(process.cwd(), "src/assets/packs");
    private static namesToIds = new Map<string, Map<string, string>>();
    private static packsMetadata = JSON.parse(fs.readFileSync(path.resolve( "./src/system.json"), "utf-8")).packs as PackMetadata[];

    constructor(packDir: string, parsedData: unknown[]) {
        const metadata = CompendiumPack.packsMetadata.find(
            (pack) => path.basename(pack.path) === path.basename(packDir)
        );
        if (metadata === undefined) {
            throw PackError(`Compendium at ${packDir} has no metadata in the local system.json file.`);
        }
        this.systemId = metadata.system;
        this.name = metadata.name;
        this.documentType = metadata.type;

        if (!this.isPackData(parsedData)) {
            throw PackError(`Data supplied for ${this.name} does not resemble Foundry document source data.`);
        }

        this.packDir = packDir;

        CompendiumPack.namesToIds.set(this.name, new Map());
        const packMap = CompendiumPack.namesToIds.get(this.name);
        if (!packMap) {
            throw PackError(`Compendium ${this.name} (${packDir}) was not found.`);
        }

        parsedData = parsedData.map(d => {
          if (!d._id) {
            // Make sure we don't generate new ids everytime we rebuild
            d._id=crypto.createHash('md5').update(d.name).digest('base64').replace(/[\+=\/]/g, '').substring(0,16);
          }
          return d;
        })

        // parsedData.sort((a, b) => {
        //     if (a._id === b._id) {
        //         throw PackError(`_id collision in ${this.name}: ${a._id}`);
        //     }
        //     return a._id > b._id ? 1 : -1;
        // });

        this.data = parsedData;



        // for (const docSource of this.data) {
        //     // Populate CompendiumPack.namesToIds for later conversion of compendium links
        //     packMap.set(docSource.name, docSource._id);
        //
        //     // Check img paths
        //     if ("img" in docSource && typeof docSource.img === "string") {
        //         const imgPaths: string[] = [docSource.img ?? ""].concat(
        //             isActorSource(docSource) ? docSource.items.map((itemData: any) => itemData.img ?? "") : []
        //         );
        //         const documentName = docSource.name;
        //         for (const imgPath of imgPaths) {
        //             if (imgPath.startsWith("data:image")) {
        //                 const imgData = imgPath.slice(0, 64);
        //                 const msg = `${documentName} (${this.name}) has base64-encoded image data: ${imgData}...`;
        //                 throw PackError(msg);
        //             }
        //
        //             const repoImgPath = path.resolve(
        //                 process.cwd(),
        //                 "static",
        //                 decodeURIComponent(imgPath).replace("systems/rqg/", "")
        //             );
        //             if (!imgPath.match(/^\/?icons\/svg/) && !fs.existsSync(repoImgPath)) {
        //                 throw PackError(`${documentName} (${this.name}) has a broken image link: ${imgPath}`);
        //             }
        //             if (!(imgPath === "" || imgPath.match(/\.(?:svg|webp)$/))) {
        //                 throw PackError(`${documentName} (${this.name}) references a non-WEBP/SVG image: ${imgPath}`);
        //             }
        //         }
        //     }
        //     if ("type" in docSource && docSource.type === "script") {
        //         docSource.permission ??= { default: 1 };
        //     }
        // }
    }

    // static loadJSON(dirPath: string): CompendiumPack {
    //     if (!dirPath.replace(/\/$/, "").endsWith(".db")) {
    //         const dirName = path.basename(dirPath);
    //         throw PackError(`JSON directory (${dirName}) does not end in ".db"`);
    //     }
    //
    //     const filenames = fs.readdirSync(dirPath);
    //     const filePaths = filenames.map((filename) => path.resolve(dirPath, filename));
    //     const parsedData = filePaths.map((filePath) => {
    //         const jsonString = fs.readFileSync(filePath, "utf-8");
    //         const packSource: CompendiumSource = (() => {
    //             try {
    //                 return JSON.parse(jsonString);
    //             } catch (error) {
    //                 if (error instanceof Error) {
    //                     throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
    //                 }
    //             }
    //         })();
    //
    //         const documentName = packSource?.name;
    //         if (documentName === undefined) {
    //             throw PackError(`Document contained in ${filePath} has no name.`);
    //         }
    //
    //         const filenameForm = toKebabCase(documentName).concat(".json");
    //         if (path.basename(filePath) !== filenameForm) {
    //             throw PackError(`Filename at ${filePath} does not reflect document name (should be ${filenameForm}).`);
    //         }
    //
    //         return packSource;
    //     });
    //
    //     const dbFilename = path.basename(dirPath);
    //     return new CompendiumPack(dbFilename, parsedData.flat());
    // }

  static loadYAML(dirPath: string): CompendiumPack {
    if (!dirPath.replace(/\/$/, "").endsWith(".db")) {
      const dirName = path.basename(dirPath);
      throw PackError(`JSON directory (${dirName}) does not end in ".db"`);
    }

    const filenames = fs.readdirSync(dirPath);
    const filePaths = filenames.map((filename) => path.resolve(dirPath, filename));
    const parsedData: unknown[] = filePaths.map((filePath) => {
      const yamlString = fs.readFileSync(filePath, "utf-8");
      const packSources: CompendiumSource = (() => {
        try {
          return yaml.loadAll(yamlString)
        } catch (error) {
          if (error instanceof Error) {
            throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
          }
        }
      })();

      //
      // if (packSources.some((d: any) => d?.name === undefined)) {
      //     throw PackError(`Document contained in ${filePath} has no name.`);
      // }

      // const filenameForm = toKebabCase(documentName).concat(".json");
      // if (path.basename(filePath) !== filenameForm) {
      //   throw PackError(`Filename at ${filePath} does not reflect document name (should be ${filenameForm}).`);
      // }

      return packSources;
    });

    const dbFilename = path.basename(dirPath);
    return new CompendiumPack(dbFilename, parsedData.flat());
  }

    private finalize(docSource: CompendiumSource) {
        return JSON.stringify(docSource)
    }

    save(): number {
        fs.writeFileSync(
            path.resolve(CompendiumPack.outDir, this.packDir),
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

// export function randomID(length=16) {
//   const rnd = () => Math.random().toString(36).substring(2);
//   let id = "";
//   while (id.length < length)
//     id += rnd();
//   return id.substring(0, length);
// }

export function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function hashCode(str: string) {
  let hash = 0, i = 0, len = str.length;
  while ( i < len ) {
    hash  = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
  }
  return hash;
}
