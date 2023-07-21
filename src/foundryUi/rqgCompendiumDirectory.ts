import { getGame, RqgError } from "../system/util";
import { systemId } from "../system/config";

export class RqgCompendiumDirectory extends CompendiumDirectory {
  static init() {
    CONFIG.ui.compendium = RqgCompendiumDirectory;
  }

  // @ts-expect-error return type
  async getData(options: any): CompendiumDirectory.Data {
    const context = await super.getData(options);

    // Filter packs for visibility updated from Foundry - the rest is a copy

    const requestedLang = getGame().settings.get(systemId, "worldLanguage");
    const showOnlyWorldLanguagePacks = getGame().settings.get(
      systemId,
      "showOnlyWorldLanguagePacks",
    );
    const showEnglishLanguagePacksAlso = getGame().settings.get(
      systemId,
      "showEnglishLanguagePacksAlso",
    );
    const requestedLangRegex = new RegExp(`(.*)-(${requestedLang})$`);
    const englishRegex = /.*-en$/;
    const splitRegex = new RegExp(`(.*)-(..)$`);

    const sortedSystemPacks = getGame().packs.reduce(
      (acc: any[], pack: CompendiumCollection<CompendiumCollection.Metadata>) => {
        // @ts-expect-error packageName
        if (pack.metadata.packageName !== systemId) {
          return acc;
        }
        const langMatch = pack.metadata.name.match(splitRegex);
        if (!langMatch) {
          throw new RqgError("System pack name did not conform with expectations", pack);
        }
        const packName = langMatch[1];
        const packLang = langMatch[2];
        let existingPacks = (acc as any)[packName] ?? {};
        const newPack = { [packLang]: pack };
        existingPacks = { ...existingPacks, ...newPack };
        (acc as any)[packName] = existingPacks;
        return acc;
      },
      [],
    );

    const packs = getGame().packs.filter((p: any) => {
      const hasAccess = getGame().user?.isGM || !p.private;

      if (p.metadata.packageName !== systemId) {
        return hasAccess; // Include all non system packs the user should have access to
      }

      const isEnglish = englishRegex.test(p.metadata.name);
      const isInRequestedLang =
        !showOnlyWorldLanguagePacks || requestedLangRegex.test(p.metadata.name);
      const shouldFallBack =
        !isInRequestedLang &&
        !sortedSystemPacks[p.metadata.name.match(splitRegex)[1]][requestedLang];

      // Only show system packs in the requested language
      return (
        hasAccess &&
        (isInRequestedLang ||
          (shouldFallBack && isEnglish) ||
          (showEnglishLanguagePacksAlso && isEnglish))
      );
    });

    // vvv  copied from foundry below  vvv

    // Sort packs by Document type
    const packData = packs
      .sort((a, b) => a.documentName.localeCompare(b.documentName))
      .reduce((obj: any, pack) => {
        const documentName = pack.documentName;
        // eslint-disable-next-line no-prototype-builtins
        if (!obj.hasOwnProperty(documentName))
          obj[documentName] = {
            label: documentName,
            packs: [],
          };
        obj[documentName].packs.push(pack);
        return obj;
      }, {});

    // Sort packs within type
    for (const p of Object.values(packData)) {
      // @ts-expect-error type of a & b
      p.packs = p.packs.sort((a, b) => a.title.localeCompare(b.title));
    }

    return foundry.utils.mergeObject(context, { packs: packData });
  }
}
