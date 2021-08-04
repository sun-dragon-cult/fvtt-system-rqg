import { RqgActor } from "../actors/rqgActor";

export function getRequiredDomDataset(el: JQuery | Event, dataset: string): string {
  const data = getDomDataset(el, dataset);
  if (!data) {
    const msg = `Couldn't find dataset [${dataset}]`;
    ui.notifications?.error(msg);
    throw new RqgError(msg, el, dataset);
  }
  return data;
}

export function getDomDataset(el: JQuery | Event, dataset: string): string | undefined {
  const elem = (el as Event).target ? ((el as Event).target as HTMLElement) : (el as JQuery)[0];
  const element = elem?.closest(`[data-${dataset}]`) as HTMLElement;
  return element?.dataset[toCamelCase(dataset)];
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
  // TODO only for GM? game.user.isGM &&
  console.warn(`RQG | ${msg}`, debugData);

  notify && ui?.notifications?.warn(`${msg} - Misconfiguration: Contact the GM!`);
}

/**
 * Check if obj has property prop and narrow type of obj if so.
 */
export function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

/**
 * Find actor given an actor and a token id. This can be a synthetic token actor or a "real" one.
 */
export function getActorFromIds(actorId: string, tokenId?: string): RqgActor {
  const token = canvas
    // @ts-ignore getLayer
    ?.getLayer("TokenLayer")
    .ownedTokens.find((t: Token) => t.id === tokenId); // TODO Finds the first - what if there are more than one
  const actor = game.actors?.get(actorId) as RqgActor;
  if (!actor) {
    throw new RqgError("game.actors is not defined", token, tokenId);
  }
  return (token ? token.document.getActor() : actor) as RqgActor;
}

export function getSpeakerName(actorId: string, tokenId?: string): string {
  const token = canvas
    // @ts-ignore getLayer
    ?.getLayer("TokenLayer")
    .ownedTokens.find((t: Token) => t.id === tokenId);
  if (token) {
    return token.name;
  }

  const actor = game.actors?.get(actorId);
  if (!actor) {
    throw new RqgError("game.actors or actorId is not defined", actorId);
  }
  return actor.data.token.name;
}

export function getAllRunesIndex(): Compendium.IndexEntry[] {
  const runeCompendiumName = game.settings.get("rqg", "runesCompendium") as string;
  const pack = runeCompendiumName ?? game.packs!.get(runeCompendiumName);
  // @ts-ignore 0.8
  if (!pack?.indexed) {
    const msg = "Runes pack is not yet indexed";
    ui.notifications?.error(msg);
    throw new RqgError(msg, runeCompendiumName, pack);
  }
  // @ts-ignore 0.8
  return pack.index as unknown as Compendium.IndexEntry[];
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
