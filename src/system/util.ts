import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { hitLocationNamesObject } from "./settings/hitLocationNames";
import { ChatMessageType } from "../chat/RqgChatMessage";
import { systemId } from "./config";

export function getRequiredDomDataset(el: HTMLElement | Event | JQuery, dataset: string): string {
  const data = getDomDataset(el, dataset);
  if (!data) {
    const msg = `Couldn't find dataset [${dataset}]`;
    ui.notifications?.error(msg);
    throw new RqgError(msg, el, dataset);
  }
  return data;
}

/**
 * Get the dataset value of the first DOM element where it is set, searching
 * in parents until found.
 * @param dataset Should be formatted as kebab case without the `data-`
 * (`my-value` searches for `data-my-value`)
 */
export function getDomDataset(
  el: HTMLElement | Event | JQuery,
  dataset: string
): string | undefined {
  const elem = getHTMLElement(el);
  const closestElement = elem?.closest(`[data-${dataset}]`) as HTMLElement;
  return closestElement?.dataset[toCamelCase(dataset)];
}

/**
 * Get the dataset value of the first DOM element with the same item-id as the
 * id on the provided element.
 *
 * This is useful for finding the first element on an item row (usually the
 * image) that has a `data-rqid-link` that has an event handler to open the description
 * when clicked. The rest of the row should not open the description, but the
 * context menu needs to know if there is a description and what rqid it has.
 */
export function getDomDatasetAmongSiblings(
  el: HTMLElement | Event | JQuery,
  dataset: string
): string | undefined {
  const elem = getHTMLElement(el);
  let firstItemEl = elem;
  if (!elem) {
    const msg = `Called getFormDatasetAmongSiblings with a nonexistent element`;
    console.error(msg);
    throw new RqgError(msg, el);
  }
  // Get the itemId on the provided DOM element
  const itemId = elem.dataset.itemId;

  // Follow the siblings above the provided DOM element til the first with the same itemId
  while (
    firstItemEl?.previousElementSibling instanceof HTMLElement &&
    firstItemEl?.previousElementSibling?.dataset?.itemId === itemId
  ) {
    firstItemEl = firstItemEl.previousElementSibling;
  }
  return firstItemEl?.dataset[toCamelCase(dataset)];
}

export function getHTMLElement(el: HTMLElement | Event | JQuery): HTMLElement | undefined {
  return el instanceof HTMLElement
    ? el
    : !!(el as Event).target
    ? ((el as Event).target as HTMLElement)
    : (el as JQuery).get(0);
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
  return (getGame().settings.get(systemId, "hitLocations") as typeof hitLocationNamesObject)
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

export function toKebabCase(s: string | undefined): string {
  if (!s) {
    return "";
  }
  const match = s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

  if (!match) {
    return "";
  }

  return match.join("-").toLowerCase();
}

/**
 * Returns a new string where the characters in `charsToTrim` are removed from the front and end
 * of the `inputString`. Can for example be used to remove trailing commas in a string.
 */
export function trimChars(inputString: string, charsToTrim: string): string {
  return inputString.replace(new RegExp(`^[${charsToTrim}]+|[${charsToTrim}]+$`, "g"), "");
}

/**
 * Escape any special regex characters.
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
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

/**
 * Check if a flags of a chat message has the specified type and narrow the flag data to that type.
 */
export function assertChatMessageFlagType<T extends ChatMessageType>(
  chatMessageType: ChatMessageType | undefined,
  type: T
): asserts chatMessageType is T {
  if (!chatMessageType || chatMessageType !== type) {
    const msg = `Got unexpected chat message type in assert, ${chatMessageType} ≠ ${type}`;
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

export function usersIdsThatOwnActor(actor: RqgActor | null): string[] {
  if (actor) {
    return getGameUsers()
      .filter((user: User) =>
        // @ts-ignore foundry 9
        actor.testUserPermission(user, CONST.DOCUMENT_PERMISSION_LEVELS.OWNER)
      )
      .map((user) => user.id);
  }
  return [];
}

/**
 * Interprets the form parameter string as a string, defaulting to empty string if undefined.
 * @throws {@link RqgError} if parameter is not a string or null/undefined.
 */
export function convertFormValueToString(rawFormValue: FormDataEntryValue | null): string {
  if (rawFormValue == null) {
    return "";
  }
  if (typeof rawFormValue !== "string") {
    const msg = "Programming error: user cleanIntegerString with a non string argument";
    ui.notifications?.error(msg);
    throw new RqgError(msg, rawFormValue);
  }
  return rawFormValue;
}

/**
 * Interprets the parameter string as a possibly negative integer number.
 * @throws {@link RqgError} if parameter is not a string or null/undefined.
 */
export function convertFormValueToInteger(
  rawFormValue: FormDataEntryValue,
  defaultValue: number = 0
): number {
  const formValue = Number(cleanIntegerString(rawFormValue));
  return Number.isFinite(formValue) ? formValue : defaultValue;
}

/**
 * Removes any characters that are not possible in a potentially negative integer
 * @throws {@link RqgError} if parameter is not a string or null/undefined.
 */
export function cleanIntegerString(value: FormDataEntryValue | null): string {
  if (value == null) {
    return "";
  }
  if (typeof value !== "string") {
    const msg = "Programming error: user cleanIntegerString with a non string argument";
    ui.notifications?.error(msg);
    throw new RqgError(msg, value);
  }

  const nonIntegerRegEx = /(?!^[+-])[^0-9]/g;
  return value.replaceAll(nonIntegerRegEx, "");
}

/**
 * Find actor given an actor and a token id. This can be a synthetic token actor or a "real" one.
 * @deprecated use uuid instead
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

// A convenience getter that calls fromUuid and types the Document to what is requested.
export async function getDocumentFromUuid<T>(
  documentUuid: string | undefined
): Promise<T | undefined> {
  return documentUuid ? ((await fromUuid(documentUuid)) as T | null) ?? undefined : undefined;
}

// A convenience getter that calls fromUuid and throws error if no result.
export async function getRequiredDocumentFromUuid<T>(documentUuid: string | undefined): Promise<T> {
  const document = await getDocumentFromUuid<T>(documentUuid);
  if (!document) {
    const msg = `Actor could not be found from uuid [${documentUuid}]`; // TODO translate
    console.warn(msg);
    throw new RqgError(msg, documentUuid);
  }
  return document;
}

// A convenience getter that calls fromUuid and throws error if no result. Also handles unlinked actors.
// TODO the weird generics is because the `jsTemplate2json.mjs` refuses to work if I use RqgActor instead of T.
// TODO this method needs to be called with `getRequiredRqgActorFromUuid<RqgActor>(...` to work as intended.
export async function getRequiredRqgActorFromUuid<T>(actorUuid: string | undefined): Promise<T> {
  const rqgActorOrTokenDocument = await getRequiredDocumentFromUuid<RqgActor | TokenDocument>(
    actorUuid
  );
  if (!(rqgActorOrTokenDocument instanceof TokenDocument)) {
    return rqgActorOrTokenDocument as unknown as T; // Assume T is RqgActor
  }
  const rqgActor = rqgActorOrTokenDocument.actor;
  if (!rqgActor) {
    const msg = `TokenDocument didn't contain actor`; // TODO translate
    console.warn(msg);
    throw new RqgError(msg, rqgActorOrTokenDocument);
  }
  return rqgActor as unknown as T;
}

export type AvailableRuneCache = {
  name: string;
  img: string;
  rqid: string;
};

let availableRunes: AvailableRuneCache[] = [];

/**
 * Get the cached data about the runes that are available in the world.
 * @see {@link cacheAvailableRunes}
 */
export function getAvailableRunes(): AvailableRuneCache[] {
  if (availableRunes.length > 0) {
    return availableRunes;
  }
  ui.notifications?.warn("compendiums not indexed yet, try again!");
  cacheAvailableRunes();
  return [];
}

/**
 * Go through all compendiums and make a list of all the unique runes in them
 * using rqid to find the runes and storing name, img & rqid for each.
 */
export async function cacheAvailableRunes(): Promise<AvailableRuneCache[]> {
  if (availableRunes.length > 0) {
    return availableRunes;
  }
  const compendiumRuneIndexData = (
    await Promise.all(
      getGame().packs.map(async (pack: CompendiumCollection<CompendiumCollection.Metadata>) => {
        // @ts-expect-error indexed
        if (!pack.indexed) {
          await pack.getIndex();
        }
        return getRuneIndexData(pack);
      })
    )
  ).flat();

  // Only keep one of each rqid, the one with the highest priority
  const highestPriorityRunesData: any = compendiumRuneIndexData.reduce(
    (acc: AvailableRuneCache[], runeIndexData: any) => {
      const toReplaceRune = acc.findIndex(
        (r: any) =>
          r.rqid === runeIndexData.rqid && Number(r.priority) <= Number(runeIndexData.priority)
      );
      if (toReplaceRune >= 0) {
        acc.splice(toReplaceRune, 1, runeIndexData);
      } else if (!acc.some((r) => r.rqid === runeIndexData.rqid)) {
        acc.push(runeIndexData);
      }
      return acc;
    },
    []
  );

  availableRunes = highestPriorityRunesData.map((r: any) => ({
    name: r.name,
    img: r.img,
    rqid: r.rqid,
  }));
  return availableRunes;
}

function getRuneIndexData(
  pack: CompendiumCollection<CompendiumCollection.Metadata>
): AvailableRuneCache[] {
  return pack.index.reduce((acc, indexData) => {
    // @ts-expect-error flags
    if (indexData?.flags?.rqg?.documentRqidFlags?.id?.startsWith("i.rune.")) {
      acc.push({
        // @ts-expect-error name
        name: indexData.name ?? "",
        // @ts-expect-error img
        img: indexData.img ?? "",
        // @ts-expect-error flags
        rqid: indexData?.flags?.rqg?.documentRqidFlags?.id ?? "",
        // @ts-expect-error flags
        priority: indexData?.flags?.rqg?.documentRqidFlags?.priority ?? "",
      });
    }
    return acc;
  }, []);
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
    const collection = docName && (CONFIG as any)[docName]?.collection.instance;
    const doc = collection && collection.get(docId);
    name = doc?.name;
    name = name ? name + ` (from world items)` : name;
  }
  return name || null;
}

/**
 * A system specific Error that can encapsulate extra debugging information (in `debugData`)
 */
export class RqgError implements Error {
  public name: string = "RqgError";
  public debugData: any[];

  constructor(public message: string, ...debugData: any[]) {
    // Maintains proper stack trace for where our error was thrown.
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
      `RQG | Attempt to localize the key ${key} resulted in the same value. This key may need an entry in the language json (ie en/openSystem.json).`
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

/**
 * This is for the transition period before we make a clean switch to Foundry v10.
 * When reading data from itemData the actual data is either behind `.data` or `.system`
 * depending on Foundry version.
 * If the data is no longer an item (just an item data object) the Foundry polyfills won't work.
 * In that case use the `systemProp` constant to make it work in both: `itemdata[systemProp()]`.
 */
export function systemProp(): string {
  return (getGame() as any).data.release.generation > 9 ? "system" : "data";
}
