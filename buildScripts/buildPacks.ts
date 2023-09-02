import chalk from "chalk";
import * as path from "path";
import * as fs from "fs";
import { cwd } from "process";
import { CompendiumPack, PackMetadata } from "./compendium-pack";
import { tryOrThrow } from "./utils";
import { PackError } from "./packError";
import { existsSync, promises } from "fs";

export const config = {
  i18nDir: path.resolve(cwd(), "src", "i18n"),
  translationsFileNames: ["uiContent"], // filenames except .json Will be part of the translation key
  distDir: path.resolve(cwd(), "dist"),
  packTemplateDir: path.resolve(cwd(), "src", "assets", "pack-templates"),
  packageManifest: path.resolve(cwd(), "src", "system.json"),
} as const;

export const getPackOutDir = (): string => path.join(config.distDir, "packs");

const moduleManifest = JSON.parse(fs.readFileSync(config.packageManifest, "utf-8"));
export const packsMetadata = moduleManifest.packs as PackMetadata[];

if (existsSync(getPackOutDir())) {
  await promises.rm(getPackOutDir(), { recursive: true, force: true });
}

const templatePackDirPaths = fs
  .readdirSync(config.packTemplateDir)
  .map((dirName) => path.resolve(config.packTemplateDir, dirName));

// Loads all template packs into memory
const templatePacks = templatePackDirPaths.map((dirPath) => CompendiumPack.loadYAML(dirPath));

const translatedPacks: CompendiumPack[] = [];
const lang = "en"; // only build English packs
templatePacks.forEach((pack) => {
  tryOrThrow(
    () => translatedPacks.push(pack.translate(lang)),
    (e: any) => {
      throw new PackError(`Error translating pack ${pack.name} to ${lang}: \n\n${e}`);
    },
  );
});

let total = 0;
for (const pack of translatedPacks) {
  total += await pack.save();
}

if (translatedPacks.length === 0) {
  throw new PackError("No data available to build packs.");
}

console.log(
  chalk.green(
    `Created ${chalk.bold(translatedPacks.length)} packs with ${chalk.bold(total)} documents.`,
  ),
);
