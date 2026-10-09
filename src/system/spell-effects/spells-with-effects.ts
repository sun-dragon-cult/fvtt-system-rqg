import { isValidRqidString } from "../api/rqid-validation";
import { systemId } from "../config";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { spellBehaviour } from "./spell-behaviour";

/** The parts of a compendium index entry needed to find the spells that have an effect. */
export type SpellIndexEntry = {
  type?: string;
  name?: string;
  system?: { effectRqidLink?: { rqid?: string } | null };
  flags?: { rqg?: { documentRqidFlags?: { id?: string; lang?: string; priority?: number } } };
};

/**
 * The spells with an effect template or a behaviour that applies itself, one per rqid: in `lang`
 * when there is a copy in it, else in `fallbackLang`, and of those the highest priority. Sorted by
 * name.
 */
export function pickSpellsWithEffects<T extends SpellIndexEntry>(
  entries: Iterable<T>,
  lang: string,
  fallbackLang: string,
  appliesItself: (spellRqid: string) => boolean = () => false,
): T[] {
  const langRank = (entry: T) => {
    const entryLang = entry.flags?.rqg?.documentRqidFlags?.lang;
    return entryLang === lang ? 2 : entryLang === fallbackLang ? 1 : 0;
  };
  const best = new Map<string, T>();
  for (const entry of entries) {
    const rqid = entry.flags?.rqg?.documentRqidFlags?.id;
    const isSpell =
      entry.type === ItemTypeEnum.SpiritMagic || entry.type === ItemTypeEnum.RuneMagic;
    if (
      !rqid ||
      !isSpell ||
      !langRank(entry) ||
      !(isValidRqidString(entry.system?.effectRqidLink?.rqid) || appliesItself(rqid))
    ) {
      continue;
    }
    const current = best.get(rqid);
    const priority = entry.flags?.rqg?.documentRqidFlags?.priority ?? -Infinity;
    const currentPriority = current?.flags?.rqg?.documentRqidFlags?.priority ?? -Infinity;
    if (
      !current ||
      langRank(entry) > langRank(current) ||
      (langRank(entry) === langRank(current) && priority > currentPriority)
    ) {
      best.set(rqid, entry);
    }
  }
  return [...best.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
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
    (spellRqid) => !!spellBehaviour(spellRqid)?.apply,
  );
  const spells = await Promise.all(picked.map((entry) => entry.pack.getDocument(entry._id)));
  return spells.filter((spell) => !!spell) as unknown as RqgItem[];
}
