import { RqgActor } from "../actors/rqgActor";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { hitLocationNamesObject } from "./settings/hitLocationNames";

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
      actor.testUserPermission(user, CONST.ENTITY_PERMISSIONS.OWNER)
    );
  }
  return [];
}

/**
 * Find actor given an actor and a token id. This can be a synthetic token actor or a "real" one.
 */
export function getActorFromIds(actorId: string | null, tokenId: string | null): RqgActor | null {
  const token = canvas?.getLayer("TokenLayer")?.ownedTokens.find((t: Token) => t.id === tokenId); // TODO Finds the first - what if there are more than one
  const actor = actorId ? getGame().actors?.get(actorId) ?? null : null;
  return token ? token.document.getActor() : actor;
}

export function getSpeakerName(actorId: string | null, tokenId: string | null): string {
  const token = canvas?.getLayer("TokenLayer")?.ownedTokens.find((t: Token) => t.id === tokenId);
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
