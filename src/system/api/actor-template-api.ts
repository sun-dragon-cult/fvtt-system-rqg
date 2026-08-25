import {
  documentRqidFlags,
  tagsFlag,
  type DocumentRqidFlags,
} from "../../data-model/shared/rqg-document-flags";
import { RQG_CONFIG, systemId } from "../config";
import { localize } from "../util";

/** True if `tag` is `filterTag` itself, or a colon-hierarchical child of it. */
export function tagMatchesFilter(tag: string, filterTag: string): boolean {
  return tag === filterTag || tag.startsWith(`${filterTag}:`);
}

export function actorTagsMatchFilter(tags: string[] | undefined, filterTag: string): boolean {
  return (tags ?? []).some((tag) => tagMatchesFilter(tag, filterTag));
}

export function isActorTemplate(tags: string[] | undefined): boolean {
  return (tags ?? []).includes(RQG_CONFIG.actorTemplateGateTag);
}

export interface ActorTemplateEntry {
  uuid: string;
  name: string;
  img?: string | null;
  /** All tags except RQG_CONFIG.actorTemplateGateTag. */
  tags: string[];
  /** e.g. "World" or "<module title> — <pack title>". */
  source: string;
  rqid?: DocumentRqidFlags;
}

/** Minimal shape of a compendium index entry with actor-template flags. */
type ActorTemplateIndexEntry = {
  _id: string;
  uuid: string;
  name?: string;
  img?: string | null;
  folder?: string;
  flags?: { rqg?: { tags?: string[]; documentRqidFlags?: DocumentRqidFlags } };
};

function toEntry(
  uuid: string,
  name: string,
  img: string | null | undefined,
  tags: string[],
  source: string,
  rqid: DocumentRqidFlags | undefined,
): ActorTemplateEntry {
  return {
    uuid,
    name,
    img,
    tags: tags.filter((tag) => tag !== RQG_CONFIG.actorTemplateGateTag),
    source,
    rqid,
  };
}

/** World language preferred, then rqid priority (like Rqid.compareRqidPrio), then name. */
export function compareTemplates(
  a: ActorTemplateEntry,
  b: ActorTemplateEntry,
  worldLanguage: string,
): number {
  const aMatchesLang = a.rqid?.lang === worldLanguage;
  const bMatchesLang = b.rqid?.lang === worldLanguage;
  if (aMatchesLang !== bMatchesLang) {
    return aMatchesLang ? -1 : 1;
  }

  // Finite, not Infinity: `-Infinity - -Infinity` is NaN.
  const NO_PRIORITY = Number.MIN_SAFE_INTEGER;
  const byPriority = (b.rqid?.priority ?? NO_PRIORITY) - (a.rqid?.priority ?? NO_PRIORITY);
  if (byPriority !== 0) {
    return byPriority;
  }

  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) {
    return byName;
  }
  return a.source.localeCompare(b.source);
}

/** The owning module's (or system's) title, falling back to the raw package id. */
function getPackSourceLabel(pack: CompendiumCollection.Any): string {
  const packageName = pack.metadata.packageName;
  if (packageName === game.system?.id) {
    return game.system?.title ?? packageName;
  }
  return game.modules?.get(packageName)?.title ?? packageName;
}

/** Full "Grandparent / Parent / Folder" path, root first. */
function getFolderPath(folder: Folder.Stored | null | undefined): string {
  if (!folder) {
    return "";
  }
  return [...folder.ancestors]
    .reverse()
    .concat(folder)
    .map((f) => f.name)
    .filter(Boolean)
    .join(" / ");
}

/** Scans world Actors and all Actor compendium packs for RQG_CONFIG.actorTemplateGateTag. */
export async function getActorTemplates(): Promise<ActorTemplateEntry[]> {
  const results: ActorTemplateEntry[] = [];

  const worldLabel = localize("RQG.Dialog.ActorTemplatePicker.SourceWorld");
  for (const actor of game.actors ?? []) {
    const tags = actor.getFlag(systemId, tagsFlag);
    if (isActorTemplate(tags) && actor.uuid && actor.name) {
      const folderPath = getFolderPath(actor.folder);
      const source = folderPath ? `${worldLabel} — ${folderPath}` : worldLabel;
      const rqid = actor.getFlag(systemId, documentRqidFlags);
      results.push(toEntry(actor.uuid, actor.name, actor.img, tags ?? [], source, rqid));
    }
  }

  for (const pack of game.packs ?? []) {
    if (pack.documentClass?.documentName !== "Actor") {
      continue;
    }
    if (!pack.indexed) {
      await pack.getIndex();
    }
    const packSource = `${getPackSourceLabel(pack)} — ${pack.title}`;
    const indexEntries = [...pack.index.values()] as ActorTemplateIndexEntry[];
    for (const entry of indexEntries) {
      const tags = entry.flags?.rqg?.tags;
      if (isActorTemplate(tags) && entry.name) {
        const folderPath = entry.folder ? getFolderPath(pack.folders.get(entry.folder)) : "";
        const source = folderPath ? `${packSource} / ${folderPath}` : packSource;
        const rqid = entry.flags?.rqg?.documentRqidFlags;
        results.push(toEntry(entry.uuid, entry.name, entry.img, tags ?? [], source, rqid));
      }
    }
  }

  const worldLanguage: string =
    game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return results.sort((a, b) => compareTemplates(a, b, worldLanguage));
}
