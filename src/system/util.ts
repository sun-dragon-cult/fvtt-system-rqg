import { RqgActor } from "../actors/rqgActor";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { RqgItem } from "../items/rqgItem";
import { SkillDataSource } from "../data-model/item-data/skillData";
import { ArmorDataSource } from "../data-model/item-data/armorData";
import { JournalEntryLink } from "../data-model/shared/journalentrylink";

export function getRequiredDomDataset(el: HTMLElement | Event | JQuery, dataset: string): string {
  const data = getDomDataset(el, dataset);
  if (!data) {
    const msg = `Couldn't find dataset [${dataset}]`;
    ui.notifications?.error(msg);
    throw new RqgError(msg, el, dataset);
  }
  return data;
}

export function getDomDataset(
  el: HTMLElement | Event | JQuery,
  dataset: string
): string | undefined {
  const elem =
    el instanceof HTMLElement
      ? el
      : !!(el as Event).target
      ? ((el as Event).target as HTMLElement)
      : (el as JQuery).get(0);

  const closestElement = elem?.closest(`[data-${dataset}]`) as HTMLElement;
  return closestElement?.dataset[toCamelCase(dataset)];
}

/**
 * Gets game and Throws RqgExceptions if not initialized yet.
 */
export function getGame(): Game {
  if (!(game instanceof Game)) {
    const msg = `game is not initialized yet! (Initialized between the 'DOMContentLoaded' event and the 'init' hook event.)`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
  return game;
}

/**
 * Gets game.users and Throws RqgExceptions if not initialized yet.
 */
export function getGameUsers(): Users {
  const users = getGame().users;
  if (!users) {
    const msg = `game.users is not initialized yet! ( Initialized between the 'setup' and 'ready' hook events.)`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
  return users;
}

export function getHitLocations(): string[] {
  return (getGame().settings.get("rqg", "hitLocations") as typeof hitLocationNamesObject)
    .hitLocationItemNames;
}

/**
 * Gets game.user and Throws RqgExceptions if not initialized yet.
 */
export function getGameUser(): User {
  const user = getGame().user;
  if (!(user instanceof User)) {
    const msg = `game.user is not initialized yet!`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
  return user;
}

/**
 *  Converts from kebab-case & snake_case to camelCase
 */
export function toCamelCase(s: string): string {
  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
}

export function toKebabCase(s: string): string {
  if (!s) {
    return "";
  }
  const match = s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

  if (!match) {
    return "";
  }

  return match.join("-").toLowerCase();
}

export function logMisconfiguration(msg: string, notify: boolean, ...debugData: any) {
  // TODO only for GM? getGame().user.isGM &&
  console.warn(`RQG | ${msg}`, debugData);

  notify && ui?.notifications?.warn(`${msg} - Misconfiguration: Contact the GM!`);
}

/**
 * Check if obj has property prop and narrow type of obj if so.
 */
export function hasOwnProperty<X extends {} | undefined, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return obj && obj.hasOwnProperty(prop);
}

/**
 * Check if item data type if of correct type to narrow type to that itemtype.
 */
export function assertItemType<T extends ItemTypeEnum>(
  itemType: ItemTypeEnum | undefined,
  type: T
): asserts itemType is T {
  if (!itemType || itemType !== type) {
    const msg = `Got unexpected item type in assert, ${itemType} ≠ ${type}`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
}

/**
 * Check if actor data type if of correct type to narrow type to that actor type.
 */
export function assertActorType<T extends ActorTypeEnum>(
  actorType: ActorTypeEnum | undefined,
  type: T
): asserts actorType is T {
  if (!actorType || actorType !== type) {
    const msg = `Got unexpected actor type in assert, ${actorType} ≠ ${type}`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
}

export function requireValue(val: unknown, errorMessage: string, ...debugData: any): asserts val {
  if (val == null) {
    ui.notifications?.error(errorMessage);
    throw new RqgError(errorMessage, debugData);
  }
}

export function usersThatOwnActor(actor: RqgActor | null): StoredDocument<User>[] {
  if (actor) {
    return getGameUsers().filter((user: User) =>
      // @ts-ignore foundry 9
      actor.testUserPermission(user, CONST.DOCUMENT_PERMISSION_LEVELS.OWNER)
    );
  }
  return [];
}

/**
 * Find actor given an actor and a token id. This can be a synthetic token actor or a "real" one.
 */
export function getActorFromIds(actorId: string | null, tokenId: string | null): RqgActor | null {
  // @ts-ignore for foundry 9
  const token = canvas.layers
    .find((l) => l.name === "TokenLayer")
    // @ts-ignore for foundry 9
    ?.ownedTokens.find((t: Token) => t.id === tokenId); // TODO Finds the first - what if there are more than one
  const actor = actorId ? getGame().actors?.get(actorId) ?? null : null;
  return token ? token.document.getActor() : actor;
}

export function getSpeakerName(actorId: string | null, tokenId: string | null): string {
  // @ts-ignore for foundry 9
  const token = canvas.layers
    .find((l) => l.name === "TokenLayer")
    // @ts-ignore for foundry 9
    ?.ownedTokens.find((t: Token) => t.id === tokenId);
  if (token) {
    return token.name;
  }

  const actor = actorId ? getGame().actors?.get(actorId) : null;
  return actor?.data.token.name ?? ""; // TODO What to do if token name is undefined
}

export function getAllRunesIndex(): IndexTypeForMetadata<CompendiumCollection.Metadata> {
  const runeCompendiumName = getGame().settings.get("rqg", "runesCompendium");
  const pack = getGame().packs.get(runeCompendiumName);
  if (!pack) {
    const msg = `Couldn't find Compendium of runes named ${runeCompendiumName}`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
  // @ts-ignore waiting for issue #897 in foundry-vtt-types
  if (!pack.indexed) {
    const msg = "Runes pack is not yet indexed, try again";
    ui.notifications?.error(msg);
    getGame().packs!.get(runeCompendiumName)!.getIndex();
  }
  return pack.index;
}

// Returns the linked item name in the compendium for items extending JournalEntryLink
export function getJournalEntryName(itemData: any): string {
  if (!itemData.journalId) {
    return "";
  }
  if (itemData.journalPack) {
    const pack = getGame().packs.get(itemData.journalPack);
    // @ts-ignore name
    return pack?.index.get(itemData.journalId)?.name;
  } else {
    return getGame().journal?.get(itemData.journalId)?.name ?? "";
  }
}

export function getJournalEntryNameByJournalEntryLink(link: JournalEntryLink): string {
  if (!link.journalId) {
    return "";
  }
  if (link.journalPack) {
    const pack = getGame().packs.get(link.journalPack);
    // @ts-ignore name
    return pack?.index.get(link.journalId)?.name;
  } else {
    return getGame().journal?.get(link.journalId)?.name ?? "";
  }
}

export function uuid2Name(uuid: string | undefined): string | null {
  const parts = uuid?.split(".") ?? [];
  let name;

  // Compendium Documents
  if (parts[0] === "Compendium") {
    parts.shift();
    const [scope, packName, id] = parts.slice(0, 3);
    const pack = getGame().packs.get(`${scope}.${packName}`);
    // @ts-ignore name
    name = pack?.index.get(id)?.name;
    name = name ? name + ` (from compendium ${scope}.${packName})` : name;
  } else {
    // World Documents
    const [docName, docId] = parts.slice(0, 2);
    const collection = docName && (CONFIG as any)[docName].collection.instance;
    const doc = collection && collection.get(docId);
    name = doc?.name;
    name = name ? name + ` (from world items)` : name;
  }
  return name || null;
}

export class RqgError implements Error {
  public name: string = "RqgError";
  public debugData: any[];
  constructor(public message: string, ...debugData: any[]) {
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RqgError);
    }
    this.debugData = debugData;
  }
}

// Temporary fix to get both v8 & v9 compatability
export function getDocumentTypes(): {
  [Key in foundry.CONST.EntityType | "Setting" | "FogExploration"]: string[];
} {
  if (getGame().system.entityTypes) {
    return getGame().system.entityTypes; // v8
  } else {
    // @ts-ignore
    return getGame().system.documentTypes as {
      [Key in foundry.CONST.EntityType | "Setting" | "FogExploration"]: string[];
    }; // v9
  }
}

export function moveCursorToEnd(el: HTMLInputElement) {
  el.focus();
  const originalInputType = el.type;
  if (originalInputType === "number") {
    el.type = "text";
  }
  el.selectionStart = el.selectionEnd = el.value.length;
  if (originalInputType === "number") {
    el.type = "number";
  }
}

/**
 * Used as a workaround since mergeObject removes keys that have the foundry "update remove key syntax" `-=key`
 * To mark keys for removal add the deleteKeyPrefix like this `[`${deleteKeyPrefix}key`]: null` and run this just before update.
 */
export function convertDeleteKeyToFoundrySyntax(obj: object): object {
  const resultObj: any = {};
  if (obj == null) {
    return obj;
  }
  if (getType(obj) === "string") {
    // Don't split strings into character arrays
    return obj;
  }
  for (let [key, value] of Object.entries(obj)) {
    key = key.replace(new RegExp(`^${deleteKeyPrefix}`), "-="); // Only replace deleteKeyPrefix (--=) at the start of a key
    if (getType(value) === "Object") {
      resultObj[key] = convertDeleteKeyToFoundrySyntax(value);
    } else if (getType(value) === "Array") {
      resultObj[key] = value.map((v: any) => convertDeleteKeyToFoundrySyntax(v));
    } else {
      resultObj[key] = value;
    }
  }
  return resultObj;
}

export const deleteKeyPrefix = "--=";

export function localize(key: string, data?: Record<string, unknown>): string {
  const result = getGame().i18n.format(key, data);
  if (result === key) {
    console.log(
      `Attempt to localize the key ${key} resulted in the same value. This key may need an entry in the language json (ie en.json).`
    );
  }
  return result;
}

export function localizeItemType(itemType: ItemTypeEnum): string {
  return localize("ITEM.Type" + itemType.titleCase());
}

/**
 * Formats the value as a modifier, ie negative numbers have a "-" and zero or positive numbers have a "+"
 * @param value The value to format
 * @returns A string with the value formatted as a modifier.
 */
export function formatModifier(value: number): string {
  if (value < 0) {
    return String(value);
  } else {
    return "+" + String(value);
  }
}

/**
 * Formats and localizes a characteristic name.
 * @param characteristic ie: "strength"
 * @returns Fully formatted and localized name, ie: "Strength (STR)"
 */
export function localizeCharacteristic(characteristic: string): string {
  const name = localize(`RQG.Actor.Characteristics.${characteristic}-full`);
  const abbr = localize(`RQG.Actor.Characteristics.${characteristic}`);
  return localize(`RQG.Actor.Characteristics.format`, { name: name, abbr: abbr });
}

/**
 * Sets the Chat sidebar tab to active.
 */
export function activateChatTab() {
  // TODO: add player setting to allow skipping this if they don't like the tab changing
  // @ts-ignore 0.8 tabs
  ui?.sidebar?.tabs.chat && ui.sidebar?.activateTab(ui.sidebar.tabs.chat.tabName);
}

export function getDefaultRqid(item: RqgItem): string {
  if (item.type === ItemTypeEnum.Skill) {
    const skill = item.data as SkillDataSource;
    if (skill.data.specialization) {
      return toKebabCase(`${item.type}-${skill.data.skillName}-${skill.data.specialization}`);
    } else {
      return toKebabCase(`${item.type}-${skill.data.skillName}`);
    }
  }
  if (item.type === ItemTypeEnum.Armor) {
    const armor = item.data as ArmorDataSource;
    if (armor.data.namePrefix) {
      return toKebabCase(
        `${item.type}-${armor.data.namePrefix}-${armor.data.armorType}-${armor.data.material}`
      );
    } else {
      return toKebabCase(`${item.type}-${armor.data.armorType}-${armor.data.material}`);
    }
  }

  return toKebabCase(`${item.type}-${item.name}`);
}

/**
 * Return the highest priority item matching the supplied rqid and lang from the items in the World. If not
 * found return the highest priority item matching the supplied rqid and lang from the installed Compendia.
 *
 * Example:
 * ```
 * CONFIG.Item.documentClass.getItemByRqid("someid", "es")
 * ```
 */
export async function getItemByRqid(
  rqid: string,
  lang: string = "en"
): Promise<RqgItem | undefined> {
  if (!rqid) {
    return undefined;
  }

  const worldItem = await getItemFromWorldByRqid(rqid, lang);

  if (worldItem !== undefined) {
    return worldItem;
  }

  const compendiumItem = await getItemFromAllCompendiaByRqid(rqid, lang);

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

async function getItemFromWorldByRqid(
  rqid: string,
  lang: string = "en"
): Promise<RqgItem | undefined> {
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

async function getItemFromAllCompendiaByRqid(
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

export function findDatasetValueInSelfOrAncestors(
  el: HTMLElement,
  datasetname: string
): string | undefined {
  if (el.dataset[datasetname]) {
    return el.dataset[datasetname] || "";
  } else if (el.parentElement) {
    return findDatasetValueInSelfOrAncestors(el.parentElement, datasetname);
  } else {
    return undefined;
  }
}
