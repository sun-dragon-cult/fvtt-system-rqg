/**
 * Read a dataset from DOM.
 * @param el Starting point to search outwards from (or an event with a target element)
 * @param dataset A string in the form "item-id" (will match `<div data-item-id="123">)
 */
import { RqgActor } from "../actors/rqgActor";

export function getRequiredDomDataset(el: JQuery | Event, dataset: string): string {
  const data = getDomDataset(el, dataset);
  if (!data) {
    throw new RqgError(`Couldn't find dataset [${dataset}]`, el, dataset);
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
    .ownedTokens.find((t: Token) => t.id === tokenId);
  const actor = game.actors?.get(actorId) as RqgActor;
  if (!actor) {
    throw new RqgError("game.actors is not defined", token, tokenId);
  }
  return token ? (token.actor as RqgActor) : actor;
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
