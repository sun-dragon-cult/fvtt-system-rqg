import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { getGame, localize } from "../util";

/**
 * Return the highest priority item matching the supplied rqid and lang from the items in the World. If not
 * found return the highest priority item matching the supplied rqid and lang from the installed Compendia.
 *
 * Example:
 * ```
 * game.system.api.fromRqid("someid", "es")
 * ```
 */
export async function fromRqid(rqid: string, lang: string = "en"): Promise<RqgItem | undefined> {
  if (!rqid) {
    return undefined;
  }

  const worldItem = await fromWorldRqid(rqid, lang);

  if (worldItem !== undefined) {
    return worldItem;
  }

  const compendiumItem = await fromAllCompendiaRqid(rqid, lang);

  if (compendiumItem !== undefined) {
    return compendiumItem;
  } else {
    const msg = localize("RQG.Item.RqgItem.Error.ItemNotFoundByRqid", {
      rqid: rqid,
      rqidLang: lang,
    });
    ui.notifications?.warn(msg);
    console.log(msg);
  }
}

async function fromWorldRqid(rqid: string, lang: string = "en"): Promise<RqgItem | undefined> {
  if (!rqid) {
    return undefined;
  }

  const candidates = getGame().items?.contents.filter(
    (i) => i.data.data.rqid === rqid && i.data.data.rqidLang === lang
  );

  if (candidates === undefined) {
    return undefined;
  }

  if (candidates.length > 0) {
    let result = candidates.reduce((max, obj) =>
      max.data.data.rqidPriority > obj.data.data.rqidPriority ? max : obj
    );

    // Detect more than one item that could be the match
    let duplicates = candidates.filter(
      (i) => i.data.data.rqidPriority === result.data.data.rqidPriority
    );
    if (duplicates.length > 1) {
      const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInWorld", {
        rqid: rqid,
        rqidLang: lang,
        rqidPriority: result.data.data.rqidPriority,
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", duplicates);
    }
    return result as RqgItem;
  } else {
    return undefined;
  }
}

async function fromAllCompendiaRqid(
  rqid: string,
  lang: string = "en"
): Promise<RqgItem | undefined> {
  if (!rqid) {
    return undefined;
  }

  const candidates: RqgItem[] = [];

  for (const pack of getGame().packs) {
    if (pack.documentClass.name === "RqgItem") {
      for (const item of await pack.getDocuments()) {
        if (item.data.data.rqid === rqid && item.data.data.rqidLang === lang) {
          candidates.push(item as RqgItem);
        }
      }
    }
  }
  if (candidates.length === 0) {
    return undefined;
  }

  if (candidates.length > 0) {
    let result = candidates.reduce((max, obj) =>
      max.data.data.rqidPriority > obj.data.data.rqidPriority ? max : obj
    );

    // Detect more than one item that could be the match
    let duplicates = candidates.filter(
      (i) => i.data.data.rqidPriority === result.data.data.rqidPriority
    );
    if (duplicates.length > 1) {
      const msg = localize("RQG.Item.RqgItem.Error.MoreThanOneRqidMatchInCompendia", {
        rqid: rqid,
        rqidLang: lang,
        rqidPriority: result.data.data.rqidPriority,
      });
      ui.notifications?.error(msg);
      console.log(msg + "  Duplicate items: ", duplicates);
    }
    return result;
  } else {
    return undefined;
  }
}

export async function getActorTemplates(): Promise<RqgActor[] | undefined> {
  // TODO: Option 1: Find by rqid with "-template" in the rqid and of type Actor?
  // TODO: Option 2: Make a configurable world folder, and look there first, otherwise look in configurable compendium
  const speciesTemplatesCompendium = getGame().packs.get("rqg.species-templates");
  const templates = await speciesTemplatesCompendium?.getDocuments();
  if (templates) {
    return templates as RqgActor[];
  } else {
    return undefined;
  }
}
