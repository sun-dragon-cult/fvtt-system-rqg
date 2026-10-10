import { isValidRqidString } from "../api/rqid-validation";
import { systemId } from "../config";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { canApplySpell, pickRegistration } from "./spell-behaviour";

/** The parts of a compendium index entry needed to find the spells that have an effect. */
export type SpellIndexEntry = {
  type?: string;
  name?: string;
  system?: { effectRqidLink?: { rqid?: string } | null };
  flags?: { rqg?: { documentRqidFlags?: { id?: string; lang?: string; priority?: number } } };
};

/**
 * The spells Apply can do something with, one per rqid: in `lang` when there is a copy in it, else
 * in `fallbackLang`, and of those the highest priority. Sorted by name.
 */
export function pickSpellsWithEffects<T extends SpellIndexEntry>(
  entries: Iterable<T>,
  lang: string,
  fallbackLang: string,
  canApply: (spellRqid: string, effectRqidLink: { rqid?: string } | null | undefined) => boolean = (
    _rqid,
    link,
  ) => isValidRqidString(link?.rqid),
): T[] {
  const candidates = new Map<string, { lang: string; priority: number; entry: T }[]>();
  for (const entry of entries) {
    const flags = entry.flags?.rqg?.documentRqidFlags;
    const isSpell =
      entry.type === ItemTypeEnum.SpiritMagic || entry.type === ItemTypeEnum.RuneMagic;
    if (
      !flags?.id ||
      !isSpell ||
      (flags.lang !== lang && flags.lang !== fallbackLang) ||
      !canApply(flags.id, entry.system?.effectRqidLink)
    ) {
      continue;
    }
    const list = candidates.get(flags.id) ?? [];
    list.push({ lang: flags.lang, priority: flags.priority ?? -Infinity, entry });
    candidates.set(flags.id, list);
  }
  return [...candidates.values()]
    .map((list) => pickRegistration(list, lang, fallbackLang)!.entry)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

/** The compendium spells Apply can do something with, in the world's language where possible. */
export async function compendiumSpellsWithEffects(): Promise<RqgItem[]> {
  const lang = game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  const candidates: (SpellIndexEntry & { _id: string; pack: CompendiumCollection.Any })[] = [];
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") {
      continue;
    }
    const index = await pack.getIndex({ fields: ["system.effectRqidLink"] as any });
    for (const entry of index.values()) {
      candidates.push({ ...(entry as SpellIndexEntry & { _id: string }), pack });
    }
  }
  const picked = pickSpellsWithEffects(
    candidates,
    lang,
    CONFIG.RQG.fallbackLanguage,
    (spellRqid, effectRqidLink) => canApplySpell(spellRqid, effectRqidLink, lang),
  );
  const spells = await Promise.all(picked.map((entry) => entry.pack.getDocument(entry._id)));
  return spells.filter((spell) => !!spell) as unknown as RqgItem[];
}
