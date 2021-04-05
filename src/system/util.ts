/**
 * Read a dataset from DOM.
 * @param el Starting point to search outwards from (or an event with a target element)
 * @param dataset A string in the form "item-id" (will match `<div data-item-id="123">)
 */
export function getDomDataset(el: JQuery | Event, dataset: string): string {
  const elem = (el as Event).target ? ((el as Event).target as HTMLElement) : (el as JQuery)[0];
  const element = elem?.closest(`[data-${dataset}]`) as HTMLElement;

  let data = element?.dataset[toCamelCase(dataset)];
  if (!data) {
    logBug(`Couldn't find dataset [${dataset}]`, el, dataset);
  }
  return data || "";
}

/**
 *  Converts from kebab-case & snake_case to camelCase
 */
export function toCamelCase(s: string): string {
  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
}

export function logBug(msg: string, ...extraData: any) {
  ui.notifications?.error(`${msg} - Bug: Contact the Developer!`);
  console.error(`RQG | ${msg}`, extraData);
}

export function logMisconfiguration(msg: string, ...extraData: any) {
  // TODO only for GM? game.user.isGM &&
  ui.notifications?.warn(`${msg} - Misconfiguration: Contact the GM!`);
  console.warn(`RQG | ${msg}`, extraData);
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
