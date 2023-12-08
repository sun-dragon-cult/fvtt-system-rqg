import type { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import type { ChatMessageType } from "../chat/RqgChatMessage";
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
  dataset: string,
): string | undefined {
  const elem = getHTMLElement(el);
  const closestElement = elem?.closest(`[data-${dataset}]`);
  assertHtmlElement(closestElement);
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
  dataset: string,
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
    : (el as Event).target
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

export function getSocket(): io.Socket {
  if (!getGame().socket) {
    const msg = `socket is not initialized yet! ( Initialized between the 'DOMContentLoaded' event and the 'init' hook event.)`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
  return getGame().socket!;
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

  return s
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/([a-z])([A-Z])|^-|-$/g, (match, p1, p2) => {
      if (p1 && p2) {
        return `${p1}-${p2}`;
      } else {
        return "";
      }
    })
    .toLowerCase();
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
  if (notify) {
    // @ts-expect-error console
    ui?.notifications?.warn(`${msg} - Misconfiguration: Contact the GM!`, { console: false });
  }
}

/**
 * Given two arrays with objects containing a `_id` prop, merge the objects with the same _id
 */
export function mergeArraysById<T>(target: T[], source: T[]): T[] {
  source.forEach((sourceProp: any) => {
    const targetProp = target.find((targetElement: any) => {
      return sourceProp._id === targetElement._id;
    });
    targetProp ? Object.assign(targetProp, sourceProp) : target.push(sourceProp);
  });
  return target;
}

/**
 * Type guard used for filtering arrays to remove undefined & null values.
 *
 *  Example: `arr.filter(isDefined)`
 */
export function isDefined<T>(argument: T | undefined | null): argument is T {
  return argument != null;
}

/**
 * Type guard used for filtering arrays to remove falsy values.
 *
 * Example: `arr.filter(isTruthy)`
 */
export function isTruthy<T>(argument: T | undefined | null): argument is T {
  return !!argument;
}

/**
 * Check if obj has property prop and narrow type of obj if so.
 */
export function hasOwnProperty<X extends object | undefined, Y extends PropertyKey>(
  obj: X,
  prop: Y,
): obj is X & Record<Y, unknown> {
  return obj && Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Check if item data type if of correct type to narrow type to that itemtype.
 */
export function assertItemType<T extends ItemTypeEnum>(
  itemType: ItemTypeEnum | undefined,
  type: T,
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
  type: T,
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
  type: T,
): asserts chatMessageType is T {
  if (!chatMessageType || chatMessageType !== type) {
    const msg = `Got unexpected chat message type in assert, ${chatMessageType} ≠ ${type}`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
}

export function assertHtmlElement<T extends HTMLElement>(
  eventTarget: EventTarget | null | undefined,
): asserts eventTarget is T | null | undefined {
  if (eventTarget != null && !(eventTarget instanceof HTMLElement)) {
    const msg = "RQG | Programming error - expected a HTMLElement but got something else";
    ui.notifications?.warn(msg);
    throw new RqgError(msg, eventTarget);
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
        // @ts-expect-error DOCUMENT_PERMISSION_LEVELS
        actor.testUserPermission(user, CONST.DOCUMENT_PERMISSION_LEVELS.OWNER),
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
  defaultValue: number = 0,
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

// A convenience getter that calls fromUuid and types the Document to what is requested.
export async function getDocumentFromUuid<T>(
  documentUuid: string | undefined,
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
    actorUuid,
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

export enum RqidTypeStart {
  HitLocation = "i.hit-location.",
  Skill = "i.skill.",
  Rune = "i.rune.",
  Passion = "i.passion.",
  Cult = "i.background.cult-",
  Occupation = "i.background.occupation-",
  Homeland = "i.background.homeland-",
  Tribe = "i.background.tribe-",
  Clan = "i.background.clan-",
}

export type AvailableItemCache = {
  name: string;
  img: string;
  rqid: string;
};

const availableItemsCacheMap: Map<RqidTypeStart, AvailableItemCache[]> = new Map<
  RqidTypeStart,
  AvailableItemCache[]
>();

export function getAvailableItems(
  rqidTypeStart: RqidTypeStart,
  silent: boolean = false,
): AvailableItemCache[] {
  const cache = availableItemsCacheMap.get(rqidTypeStart) || [];
  if (cache.length > 0) {
    return cache;
  }
  if (!silent) {
    ui.notifications?.warn("compendiums not indexed yet, try again!");
  }
  cacheAvailableItems(rqidTypeStart);
  return [];
}

export async function cacheAvailableItems(
  rqidTypeStart: RqidTypeStart,
): Promise<AvailableItemCache[]> {
  const cache = availableItemsCacheMap.get(rqidTypeStart) || [];
  if (cache.length > 0) {
    return cache;
  }
  availableItemsCacheMap.set(rqidTypeStart, await getItemsToCache(rqidTypeStart));
  return availableItemsCacheMap.get(rqidTypeStart) || [];
}

/**
 * Go through all compendiums and make a list of all the unique item that match the rqidStart
 * in them to find the items and storing name, img & rqid for each in the supplied cache.
 */
export async function getItemsToCache(rqidStart: RqidTypeStart): Promise<AvailableItemCache[]> {
  const compendiumItemIndexData = (
    await Promise.all(
      getGame().packs.map(async (pack: CompendiumCollection<CompendiumCollection.Metadata>) => {
        // @ts-expect-error indexed
        if (!pack.indexed) {
          await pack.getIndex();
        }
        return getIndexData(rqidStart, pack);
      }),
    )
  ).flat();

  // Only keep one of each rqid, the one with the highest priority
  const highestPriorityItemData: any = compendiumItemIndexData.reduce(
    (acc: AvailableItemCache[], itemIndexData: any) => {
      const toReplaceItem = acc.findIndex(
        (r: any) =>
          r.rqid === itemIndexData.rqid && Number(r.priority) <= Number(itemIndexData.priority),
      );
      if (toReplaceItem >= 0) {
        acc.splice(toReplaceItem, 1, itemIndexData);
      } else if (!acc.some((r) => r.rqid === itemIndexData.rqid)) {
        acc.push(itemIndexData);
      }
      return acc;
    },
    [],
  );

  return highestPriorityItemData.map((r: any) => ({
    name: r.name,
    img: r.img,
    rqid: r.rqid,
  }));
}

export function getSelectItemOptions(
  rqidTypeStart: RqidTypeStart,
  emptyPlaceholderKey: string,
): AvailableItemCache[] {
  const emptyOption: AvailableItemCache = {
    rqid: "empty",
    name: localize(emptyPlaceholderKey),
    img: "",
  };
  return getSelectOptions(emptyOption, rqidTypeStart);
}

function getSelectOptions(
  emptyOption: AvailableItemCache,
  rqidTypeStart: RqidTypeStart,
): AvailableItemCache[] {
  const sortedOptions = (getAvailableItems(rqidTypeStart) ?? []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const options: AvailableItemCache[] =
    [emptyOption, ...sortedOptions].reduce((acc: any, i: any) => {
      return { ...acc, [i.rqid]: i.name };
    }, {}) ?? {};
  return options;
}

function getIndexData(
  rqidStart: RqidTypeStart,
  pack: CompendiumCollection<CompendiumCollection.Metadata>,
): AvailableItemCache[] {
  return pack.index.reduce((acc: AvailableItemCache[], indexData) => {
    // @ts-expect-error flags
    if (indexData?.flags?.rqg?.documentRqidFlags?.id?.startsWith(rqidStart)) {
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

/**
 * A system specific Error that can encapsulate extra debugging information (in `debugData`)
 */
export class RqgError implements Error {
  public name: string = "RqgError";
  public debugData: any[];

  constructor(
    public message: string,
    ...debugData: any[]
  ) {
    // Maintains proper stack trace for where our error was thrown.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RqgError);
    }
    this.debugData = debugData;
  }
}

export function getDocumentTypes(): {
  [Key in foundry.CONST.EntityType | "Setting" | "FogExploration"]: string[];
} {
  // @ts-expect-error documentTypes
  return getGame().system.documentTypes as {
    [Key in foundry.CONST.EntityType | "Setting" | "FogExploration"]: string[];
  };
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

export function localize(key: string, data?: Record<string, unknown>): string {
  const result = getGame().i18n.format(key, data);
  if (result === key) {
    console.log(
      `RQG | Attempt to localize the key ${key} resulted in the same value. This key may need an entry in the language json (ie en/uiContent.json).`,
    );
  }
  return result;
}

export function localizeItemType(itemType: ItemTypeEnum): string {
  return localize("TYPES.Item." + itemType);
}

export function localizeDocumentName(documentName: string | undefined): string {
  return documentName ? localize("DOCUMENT." + documentName) : "";
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

/**
 * The type of Intl.ListFormat type
 */
export type ListFormatType = "disjunction" | "conjunction" | "unit";

/**
 * Convert a list of strings to a string using language sensitive formatting. Use the rqg world language setting.
 *
 * Output can look like `one, two, and three` given `["one", "two", "three"]`
 */
export function formatListByWorldLanguage(
  list: string[],
  concatType: ListFormatType = "conjunction",
): string {
  const worldLanguage = (getGame().settings.get(systemId, "worldLanguage") as string) ?? "en";
  return formatListByLanguage(worldLanguage, list, concatType);
}

/**
 * Convert a list of strings to a string using language sensitive formatting. Use the user language setting.
 *
 * Output can look like `one, two, and three` given `["one", "two", "three"]`
 */
export function formatListByUserLanguage(
  list: string[],
  concatType: ListFormatType = "conjunction",
): string {
  const userLanguage = (getGame().settings.get("core", "language") as string) ?? "en";
  return formatListByLanguage(userLanguage, list, concatType);
}

function formatListByLanguage(
  language: string,
  list: string[] | undefined,
  concatType: ListFormatType,
): string {
  if (!list || list.filter(isTruthy).length === 0) {
    return "";
  }
  const listFormatter = new Intl.ListFormat(language, { style: "long", type: concatType });
  return listFormatter.format(list);
}

/**
 * Generate an array of numbers using syntax like `[...range(3,6)]` to get `[3, 4, 5, 6]`
 */
export function* range(start: number | undefined, end: number | undefined): Generator<number> {
  if (start == null || end == null || start > end) {
    return;
  }
  yield start;
  if (start === end) {
    return;
  }
  yield* range(start + 1, end);
}
