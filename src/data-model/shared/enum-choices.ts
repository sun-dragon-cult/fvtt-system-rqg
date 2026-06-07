/** Build a typed choices object from an `as const` enum object or array, preserving literal key types for StringField. */
export function enumChoices<const T extends Record<string, string>>(
  enumObj: T,
  labelPrefix: string,
): { readonly [K in T[keyof T]]: string };
export function enumChoices<const T extends readonly string[]>(
  values: T,
  labelPrefix: string,
): { readonly [K in T[number]]: string };
export function enumChoices<const T extends Record<string, string>>(
  enumObj: T,
  labelFn: (v: T[keyof T]) => string,
): { readonly [K in T[keyof T]]: string };
export function enumChoices<const T extends readonly string[]>(
  values: T,
  labelFn: (v: T[number]) => string,
): { readonly [K in T[number]]: string };
export function enumChoices(
  source: Record<string, string> | readonly string[],
  labelOrFn: string | ((v: string) => string),
): Record<string, string> {
  const values = Array.isArray(source) ? source : Object.values(source);
  const toLabel = typeof labelOrFn === "string" ? (v: string) => `${labelOrFn}${v}` : labelOrFn;
  return Object.fromEntries(values.map((v) => [v, toLabel(v)]));
}
