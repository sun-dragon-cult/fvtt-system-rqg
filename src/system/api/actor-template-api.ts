import type { RqgActor } from "../../actors/rqg-actor";
import {
  documentRqidFlags,
  tagsFlag,
  type DocumentRqidFlags,
} from "../../data-model/shared/rqg-document-flags";
import { RQG_CONFIG, systemId } from "../config";
import { localize, requireValue } from "../util";

/** True if `tag` is `filterTag` itself, or a colon-hierarchical child of it. */
export function tagMatchesFilter(tag: string, filterTag: string): boolean {
  return tag === filterTag || tag.startsWith(`${filterTag}:`);
}

export function actorTagsMatchFilter(tags: string[] | undefined, filterTag: string): boolean {
  return (tags ?? []).some((tag) => tagMatchesFilter(tag, filterTag));
}

export function isActorTemplate(tags: string[] | undefined): tags is string[] {
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

function toEntry(params: {
  uuid: string;
  name: string;
  img: string | null | undefined;
  tags: string[];
  source: string;
  rqid: DocumentRqidFlags | undefined;
}): ActorTemplateEntry {
  return {
    uuid: params.uuid,
    name: params.name,
    img: params.img,
    tags: params.tags.filter((tag) => tag !== RQG_CONFIG.actorTemplateGateTag),
    source: params.source,
    rqid: params.rqid,
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
      results.push(
        toEntry({ uuid: actor.uuid, name: actor.name, img: actor.img, tags, source, rqid }),
      );
    }
  }

  const actorPacks = [...(game.packs ?? [])].filter(
    (pack) => pack.documentClass?.documentName === "Actor",
  );
  // Load every un-indexed pack's index concurrently rather than one at a time.
  await Promise.all(actorPacks.filter((pack) => !pack.indexed).map((pack) => pack.getIndex()));

  for (const pack of actorPacks) {
    const packSource = `${getPackSourceLabel(pack)} — ${pack.title}`;
    const indexEntries = [...pack.index.values()] as ActorTemplateIndexEntry[];
    for (const entry of indexEntries) {
      const tags = entry.flags?.rqg?.tags;
      if (isActorTemplate(tags) && entry.name) {
        const folderPath = entry.folder ? getFolderPath(pack.folders.get(entry.folder)) : "";
        const source = folderPath ? `${packSource} / ${folderPath}` : packSource;
        const rqid = entry.flags?.rqg?.documentRqidFlags;
        results.push(
          toEntry({ uuid: entry.uuid, name: entry.name, img: entry.img, tags, source, rqid }),
        );
      }
    }
  }

  const worldLanguage: string =
    game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return results.sort((a, b) => compareTemplates(a, b, worldLanguage));
}

/**
 * Clones `templateActor` into a new world actor and drops the picker's gate tag from the clone -
 * a template instance is a specific actor, not itself a new template.
 */
export async function cloneActorFromTemplate(
  templateActor: RqgActor,
  updateData: { name?: string; folder?: string },
): Promise<RqgActor | undefined> {
  // clone() would otherwise recreate a compendium-sourced template into its own pack.
  let cloned: RqgActor | undefined;
  if (templateActor.pack) {
    requireValue(templateActor.id, "Template actor has no id");
    cloned = (await game.actors?.importFromCompendium(
      game.packs.get(
        templateActor.pack,
      ) as foundry.documents.collections.CompendiumCollection<"Actor">,
      templateActor.id,
      updateData,
      { renderSheet: false },
    )) as RqgActor | undefined;
  } else {
    cloned = (await templateActor.clone(updateData, {
      save: true,
      keepId: false,
    })) as RqgActor | undefined;
  }
  if (!cloned) {
    return undefined;
  }

  const tags = cloned.getFlag(systemId, tagsFlag) as string[] | undefined;
  if (isActorTemplate(tags)) {
    const remainingTags = tags.filter((tag) => tag !== RQG_CONFIG.actorTemplateGateTag);
    if (remainingTags.length) {
      await cloned.setFlag(systemId, tagsFlag, remainingTags);
    } else {
      await cloned.unsetFlag(systemId, tagsFlag);
    }
  }
  return cloned;
}
