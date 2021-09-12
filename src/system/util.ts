import { RqgActor } from "../actors/rqgActor";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";

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

/**
 * Make all but the first character lowercase
 */
export function capitalize(word: string): string {
  return word[0].toUpperCase() + word.substring(1).toLowerCase();
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

export function usersThatOwnActor(actor: RqgActor): StoredDocument<User>[] {
  return getGameUsers().filter((user: User) =>
    actor.testUserPermission(user, CONST.ENTITY_PERMISSIONS.OWNER)
  );
}

/**
 * Find actor given an actor and a token id. This can be a synthetic token actor or a "real" one.
 */
export function getActorFromIds(actorId: string, tokenId: string | null): RqgActor {
  const token = canvas?.getLayer("TokenLayer")?.ownedTokens.find((t: Token) => t.id === tokenId); // TODO Finds the first - what if there are more than one
  const actor = getGame().actors?.get(actorId);
  if (!actor) {
    throw new RqgError("game.actors is not defined", token, tokenId);
  }
  return (token ? token.document.getActor() : actor) as RqgActor;
}

export function getSpeakerName(actorId: string, tokenId: string | null): string {
  const token = canvas?.getLayer("TokenLayer")?.ownedTokens.find((t: Token) => t.id === tokenId);
  if (token) {
    return token.name;
  }

  const actor = getGame().actors?.get(actorId);
  if (!actor) {
    throw new RqgError("game.actors or actorId is not defined", actorId);
  }
  return actor.data.token.name ?? ""; // TODO What to do if token name is undefined
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
    // @ts-ignore
    return pack?.index.get(itemData.journalId)?.name;
  } else {
    return getGame().journal?.get(itemData.journalId)?.name ?? "";
  }
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
