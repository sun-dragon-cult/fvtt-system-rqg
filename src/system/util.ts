import type { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { systemId } from "./config";
import type { RqgItem } from "../items/rqgItem";
import type { PartialAbilityItem } from "../applications/AbilityRollDialog/AbilityRollDialogData.types.ts";

import Document = foundry.abstract.Document;

export function getRequiredDomDataset(
  el: HTMLElement | Element | Event | JQuery,
  dataset: string,
): string {
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
 *
 * `dataset` Should be formatted as kebab case without the `data-`
 * (`my-value` searches for `data-my-value`)
 */
export function getDomDataset(
  el: HTMLElement | Element | Event | JQuery,
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
  const itemId = elem.dataset["itemId"];

  // Follow the siblings above the provided DOM element til the first with the same itemId
  while (
    firstItemEl?.previousElementSibling instanceof HTMLElement &&
    firstItemEl?.previousElementSibling?.dataset?.["itemId"] === itemId
  ) {
    firstItemEl = firstItemEl.previousElementSibling;
  }
  return firstItemEl?.dataset[toCamelCase(dataset)];
}

export function getHTMLElement(
  el: HTMLElement | Element | Event | JQuery,
): HTMLElement | undefined {
  return el instanceof HTMLElement
    ? el
    : (el as Event).target
      ? ((el as Event).target as HTMLElement)
      : (el as JQuery).get(0);
}

export function getSocket(): io.Socket {
  if (!game.socket) {
    const msg = `socket is not initialized yet! ( Initialized between the 'DOMContentLoaded' event and the 'init' hook event.)`;
    ui.notifications?.error(msg);
    throw new RqgError(msg);
  }
  return game.socket!;
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
  // TODO only for GM? game.user.isGM &&
  console.warn(`RQG | ${msg}`, debugData);
  if (notify) {
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
    if (targetProp) {
      Object.assign(targetProp, sourceProp);
    } else {
      target.push(sourceProp);
    }
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

export function assertDefined<T>(argument: T | undefined | null): asserts argument is T {
  if (argument == null) {
    throw new RqgError("Expected value to be defined", argument);
  }
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
 * Modified to with both ItemTypeEnum and string like the `type` property on ItemData.
 * TODO The type Document.WithSubTypes includes ActorDelta that seems to miss subtypes
 */
export function assertDocumentSubType<T extends Document.WithSubTypes | RqgItem | RqgActor>(
  document: Document.WithSubTypes | RqgItem | RqgActor | undefined | null,
  itemOrActorTypes: Readonly<(string | ItemTypeEnum | ActorTypeEnum | undefined | null)[]>, // TODO accept single value too, see isDocumentSubType
  errorMsg?: string,
): asserts document is T {
  if (!document || !itemOrActorTypes.includes((document as any).type)) {
    const msg = errorMsg
      ? localize(errorMsg)
      : `Got unexpected document type in assert, [${itemOrActorTypes.join(", ")}] ≠ ${(document as any).type}`;
    ui.notifications?.error(msg);
    throw new RqgError(msg, document);
  }
}

/**
 * Check if document is defined, has the correct type and narrow to the T type.
 */
export function isDocumentSubType<T extends Document.WithSubTypes | RqgItem | RqgActor>(
  document: Document.WithSubTypes | RqgItem | RqgActor | undefined,
  documentSubTypes: Readonly<
    | (string | ItemTypeEnum | ActorTypeEnum | undefined | null)
    | (string | ItemTypeEnum | ActorTypeEnum | undefined | null)[]
  >,
): document is T {
  const documentSubTypesArray = Array.isArray(documentSubTypes)
    ? documentSubTypes
    : [documentSubTypes];
  return !!document && documentSubTypesArray.includes((document as any).type);
}

/**
 * Check if actor data type if of correct type to narrow type to that actor type.
 * @deprecated use xxx.isCharacter() instead TODO remove when no longer used
 */
export function assertActorType<T extends ActorTypeEnum>(
  actorType: string | ActorTypeEnum | undefined,
  type: T,
): asserts actorType is T {
  if (!actorType || actorType !== type) {
    const msg = `Got unexpected actor type in assert, ${actorType} ≠ ${type}`;
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

export function requireValue<T>(
  val: T,
  errorMessage: string,
  ...debugData: any
): asserts val is NonNullable<T> {
  if (val == null) {
    ui.notifications?.error(errorMessage);
    throw new RqgError(errorMessage, debugData);
  }
}

export function usersIdsThatOwnActor(actor: RqgActor | null): string[] {
  if (actor) {
    return (
      game.users
        ?.filter((user: User) =>
          actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER),
        )
        .map((user) => user.id) ?? []
    );
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
  return documentUuid ? (((await fromUuid(documentUuid)) as T | null) ?? undefined) : undefined;
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

let availableHitLocations: AvailableItemCache[] | undefined;

export function getAvailableHitLocations(silent: boolean = false): AvailableItemCache[] {
  if (availableHitLocations && availableHitLocations.length > 0) {
    return availableHitLocations; // HitLocations are previously cached
  }
  if (!silent) {
    ui.notifications?.warn("compendiums not indexed yet, try again!");
  }
  void cacheAvailableHitLocations();
  return [];
}

export type AvailableItemCache = {
  name: string;
  img: string;
  rqid: string;
  priority: string;
  lang: string;
};

let availableRunes: AvailableItemCache[] | undefined;

let lastNotIndexedWarningTimeStamp = 0;
/**
 * Get the cached data about the runes that are available in the world.
 * If the caching is not yet finished it will return an empty array.
 * @see {@link cacheAvailableRunes}
 */
export function getAvailableRunes(silent: boolean = false): AvailableItemCache[] {
  if (availableRunes && availableRunes.length > 0) {
    return availableRunes; // Runes are previously cached
  }
  if (!silent && Date.now() - lastNotIndexedWarningTimeStamp > 3000) {
    // Throttle the warnings to one every 3 seconds
    lastNotIndexedWarningTimeStamp = Date.now();
    ui.notifications?.warn("compendiums not indexed yet, try again!");
  }
  void cacheAvailableRunes();
  return [];
}

export async function cacheAvailableRunes(): Promise<AvailableItemCache[]> {
  if (availableRunes && availableRunes.length > 0) {
    return availableRunes; // Runes are previously cached
  }
  if (availableRunes?.length === 0) {
    return availableRunes; // Caching is already initiated, but not finished. Return the empty array.
  }
  availableRunes = []; // Indicate that caching is initiated
  console.time("RQG | Caching Runes took");
  availableRunes = await getItemsToCache("i.rune.");
  console.timeEnd("RQG | Caching Runes took");
  return availableRunes;
}

export async function cacheAvailableHitLocations(): Promise<AvailableItemCache[]> {
  if (availableHitLocations && availableHitLocations.length > 0) {
    return availableHitLocations; // HitLocations are previously cached
  }
  if (availableHitLocations?.length === 0) {
    return availableHitLocations; // Caching is already initiated, but not finished. Return the empty array.
  }
  availableHitLocations = [];
  console.time("RQG | Caching Hit Locations took");
  availableHitLocations = await getItemsToCache("i.hit-location.");
  console.timeEnd("RQG | Caching Hit Locations took");
  return availableHitLocations.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Go through all compendiums and make a list of all the unique item that match the rqidStart
 * in them to find the items and storing name, img & rqid for each in the supplied cache.
 */
export async function getItemsToCache(rqidStart: string): Promise<AvailableItemCache[]> {
  const compendiumItemIndexData = (
    await Promise.all(
      game.packs?.map(async (pack: CompendiumCollection<CompendiumCollection.DocumentName>) => {
        if (!pack.indexed) {
          await pack.getIndex();
        }
        return getIndexData(rqidStart, pack);
      }) ?? [],
    )
  ).flat();

  const worldLanguage =
    (game.settings?.get(systemId, "worldLanguage") as unknown as string) ??
    CONFIG.RQG.fallbackLanguage;

  // Only keep one of each rqid, the one with the highest priority, taking account of world & fallback language
  const highestPriorityItemData = compendiumItemIndexData.reduce(
    (acc: AvailableItemCache[], itemIndexData: any) => {
      const toReplaceItemIndex = acc.findIndex((maybeReplace: AvailableItemCache) => {
        if (maybeReplace.rqid !== itemIndexData.rqid) {
          return false;
        }
        const isWorldLanguage = itemIndexData.lang === worldLanguage;
        const previousIsWorldLanguage = maybeReplace.lang === worldLanguage;
        const isFallbackLanguage = itemIndexData.lang === CONFIG.RQG.fallbackLanguage;
        const previousIsFallbackLanguage = maybeReplace.lang === CONFIG.RQG.fallbackLanguage;

        if (!previousIsWorldLanguage && isWorldLanguage) {
          return true; // World language items beat other items no matter priority
        }
        if (previousIsWorldLanguage && !isWorldLanguage) {
          return false; // Don't overwrite world language items with others
        }
        if (previousIsFallbackLanguage && !(isFallbackLanguage || isWorldLanguage)) {
          return false; // Keep fallbackLanguage (english) if "other" language
        }
        if (!(previousIsWorldLanguage || previousIsFallbackLanguage) && isFallbackLanguage) {
          return true; // Overwrite "other" language with fallback language
        }
        return Number(maybeReplace.priority) < Number(itemIndexData.priority);
      });

      if (toReplaceItemIndex >= 0) {
        acc.splice(toReplaceItemIndex, 1, itemIndexData);
      } else if (!acc.some((maybeReplace) => maybeReplace.rqid === itemIndexData.rqid)) {
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
    priority: r.priority,
    lang: r.lang,
  }));
}

export function getSelectRuneOptions(emptyPlaceholderKey: string): SelectOptionData<string>[] {
  const emptyOption = { value: "empty", label: localize(emptyPlaceholderKey) };
  return getSelectOptions(emptyOption, getAvailableRunes);
}

export function getSelectHitLocationOptions(
  emptyPlaceholderKey?: string,
): SelectOptionData<string>[] {
  const emptyOption = emptyPlaceholderKey
    ? { value: "empty", label: localize(emptyPlaceholderKey) }
    : undefined;
  return getSelectOptions(emptyOption, getAvailableHitLocations);
}

function getSelectOptions(
  emptyOption: SelectOptionData<string> | undefined,
  getItemFn: () => AvailableItemCache[],
): SelectOptionData<string>[] {
  const sortedOptions = (getItemFn() ?? [])
    .map((i: any) => ({
      value: i.rqid ?? "",
      label: i.name ?? "",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (emptyOption) {
    sortedOptions.unshift(emptyOption);
  }
  return sortedOptions;
}

function getIndexData(
  rqidStart: string,
  pack: CompendiumCollection<CompendiumCollection.DocumentName>,
): AvailableItemCache[] {
  return pack.index.reduce((acc: AvailableItemCache[], indexEntry: any) => {
    if (indexEntry?.flags?.rqg?.documentRqidFlags?.id?.startsWith(rqidStart)) {
      acc.push({
        name: indexEntry.name ?? "",
        img: indexEntry.img ?? "",
        rqid: indexEntry?.flags?.rqg?.documentRqidFlags?.id ?? "",
        priority: indexEntry?.flags?.rqg?.documentRqidFlags?.priority ?? "",
        lang: indexEntry?.flags?.rqg?.documentRqidFlags?.lang ?? "",
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

export function getItemDocumentTypes(): string[] {
  // @ts-expect-error documentTypes
  const documentTypes = game.system.documentTypes.Item as any[];
  if (Array.isArray(documentTypes)) {
    // v11 format TODO remove when requiring v12
    return documentTypes;
  }
  // v12 version format
  return Object.keys(documentTypes);
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

export function localize(key: string, data?: Record<string, string>): string {
  const result = game.i18n?.format(key, data) ?? key;
  if (result === key) {
    console.log(
      `RQG | Attempt to localize the key ${key} resulted in the same value. This key may need an entry in the language json (ie en/uiContent.json).`,
    );
  }
  return result;
}

export function localizeItemType(itemType: ItemTypeEnum | string | "reputation"): string {
  return localize("TYPES.Item." + itemType);
}

export function localizeDocumentName(documentName: string | undefined): string {
  return documentName ? localize("DOCUMENT." + documentName) : "";
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
 * Sets the Chat sidebar tab to active and expands the sidebar is collapsed.
 */
export function activateChatTab() {
  if (game.settings?.get(systemId, "autoActivateChatTab")) {
    ui.sidebar?.changeTab("chat", "primary");
    ui.sidebar?.toggleExpanded(true);
  }
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
  const worldLanguage =
    (game.settings?.get(systemId, "worldLanguage") as unknown as string) ??
    CONFIG.RQG.fallbackLanguage;
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
  const userLanguage =
    (game.settings?.get("core", "language") as unknown as string) ?? CONFIG.RQG.fallbackLanguage;
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

export function getSpeakerFromItem(item: RqgItem | PartialAbilityItem): ChatMessage.SpeakerData {
  const tokenOrActor = getTokenOrActorFromItem(item);
  const token = tokenOrActor instanceof TokenDocument ? tokenOrActor : undefined;
  const actor = tokenOrActor instanceof Actor ? tokenOrActor : undefined;
  return ChatMessage.getSpeaker({
    token: token,
    actor: token ? undefined : actor,
  });
}

/**
 * Get the token that is associated with the item's parent actor, by looking at the tokens in the active scene.
 */
export function getTokenFromItem(item: RqgItem | PartialAbilityItem): TokenDocument | undefined {
  const token = getTokenFromActor(item.parent);

  if (token) {
    return token;
  } else {
    return (item as PartialAbilityItem).actingToken;
  }
}

/**
 * Get the token that is associated with the item's parent actor, by looking at the tokens in the active scene.
 * If there is no token, it will return the actor itself.
 */
export function getTokenOrActorFromItem(
  item: RqgItem | PartialAbilityItem,
): TokenDocument | RqgActor | undefined {
  const token = getTokenFromActor(item.parent);

  if (token) {
    return token;
  } else if ((item as PartialAbilityItem).actingToken) {
    return (item as PartialAbilityItem).actingToken;
  } else {
    return item.parent ?? undefined;
  }
}

/**
 * Get the token that is associated with actor, by looking at the tokens in the active scene.
 */
export function getTokenFromActor(actor: RqgActor | undefined | null): TokenDocument | undefined {
  // First try to get the token from the item parent, this only works if the actor is unlinked
  const tokenFromUnlinkedActor = actor?.token;
  if (tokenFromUnlinkedActor) {
    return tokenFromUnlinkedActor;
  }

  // If the actor is linked, we need to get the token from the active scene by comparing IDs
  const owningActorTokens: TokenDocument[] =
    actor?.getActiveTokens()?.map((t: any) => t.document) ?? [];
  const attackingToken =
    owningActorTokens[0] ?? game.scenes?.current?.tokens.find((t) => t.actorId === actor?.id); // TODO t.actor.id => t.actorId
  return attackingToken;
}

/**
 * The V13 Foundry version returns a &minus; sign instead of a normal - which makes it impossible
 * to do a Number(x) on the resulting string to revert into number again.
 */
export function toSignedString(num: number) {
  const n = num.toLocaleString(game.i18n?.lang);

  if (num === 0) {
    return n;
  }
  if (num < 0) {
    return n;
  } else {
    return `+${n}`;
  }
}

/**
 * Get the actor name with a link if the actor has a prototype token that is linked and the user is GM.
 */
export function getActorLinkDecoration(actor: RqgActor | Actor | null | undefined): string {
  if (game.user?.isGM) {
    return actor?.prototypeToken.actorLink ? " 🔗" : "";
  } else {
    return "";
  }
}
