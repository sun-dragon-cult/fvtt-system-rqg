import * as path from "path";
import * as fs from "fs";
import { CompendiumPack, PackError, PackMetadata } from "./compendium-pack";

export const i18nDir = "src/i18n";
export const translationsFileNames: string[] = ["uiContent", "rqgCompendiumContent"];
export const outDir = path.resolve(process.cwd(), "src/assets/packs");
export const packsMetadata = JSON.parse(fs.readFileSync(path.resolve("./src/system.json"), "utf-8"))
  .packs as PackMetadata[];
export const packTemplateDir = "./src/assets/pack-templates";
const targetLanguages = fs.readdirSync(i18nDir).filter((file) => {
  return fs.statSync(path.join(i18nDir, file)).isDirectory();
});

const templatePacksDataPath = path.resolve(path.resolve(packTemplateDir));
const templatePackDirPaths = fs
  .readdirSync(templatePacksDataPath)
  .map((dirName) => path.resolve(path.resolve(templatePacksDataPath, dirName)));

// Loads all template packs into memory
const templatePacks = templatePackDirPaths.map((dirPath) => CompendiumPack.loadYAML(dirPath));

const translatedPacks: CompendiumPack[] = [];
templatePacks.forEach((pack) => {
  targetLanguages.forEach((lang) => {
    try {
      translatedPacks.push(pack.translate(lang));
    } catch (error) {
      if (error instanceof Error) {
        throw new PackError(`Error translating pack ${pack.name} to ${lang}: \n\n${error.message}`);
      }
    }
  });
});

const entityCounts = translatedPacks.map((pack) => pack.save());
const total = entityCounts.reduce((runningTotal, entityCount) => runningTotal + entityCount, 0);

if (entityCounts.length > 0) {
  const languageCount = targetLanguages.length;
  console.log(
    `Created ${entityCounts.length} packs with ${
      total / languageCount
    } documents per language in ${languageCount} languages.`,
  );
} else {
  throw new PackError("No data available to build packs.");
}
