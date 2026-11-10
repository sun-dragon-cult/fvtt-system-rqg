/** One stored entry: the link, or an object holding it under the field's link key. Other properties
 * of an entry are kept as they are. */
export type RqgLinkFieldEntry = Record<string, unknown>;

/** The rqid of an entry, read from `entry[linkKey]` or from the entry itself; "" if it has none. */
export function rqidOf(entry: RqgLinkFieldEntry, linkKey?: string): string {
  const link = linkKey ? entry[linkKey] : entry;
  const rqid = (link as { rqid?: unknown } | null | undefined)?.rqid;
  return typeof rqid === "string" ? rqid : "";
}

/** A new entry holding `link`, under `linkKey` when the field has one. */
export function entryFor(link: { rqid: string }, linkKey?: string): RqgLinkFieldEntry {
  return linkKey ? { [linkKey]: { ...link } } : { ...link };
}

/** The entries in a field value: an array, one entry, or nothing. Entries without an rqid are
 * dropped. */
export function toLinks(value: unknown, linkKey?: string): RqgLinkFieldEntry[] {
  const entries: unknown[] = Array.isArray(value) ? value : value ? [value] : [];
  return entries.filter(
    (entry): entry is RqgLinkFieldEntry =>
      typeof entry === "object" &&
      entry !== null &&
      rqidOf(entry as RqgLinkFieldEntry, linkKey) !== "",
  );
}

/** A `value` attribute holding JSON; nothing when it is empty or invalid. */
export function parseJson(raw: string | null): unknown {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Uuid fields store uuid strings; their entries are `{ uuid }`, which are read too. Entries
 * without a uuid are dropped. */
export function toUuidEntries(value: unknown): RqgLinkFieldEntry[] {
  const entries: unknown[] = Array.isArray(value) ? value : value ? [value] : [];
  return entries
    .map((entry) => (typeof entry === "string" ? entry : (entry as { uuid?: unknown })?.uuid))
    .filter((uuid): uuid is string => typeof uuid === "string" && uuid !== "")
    .map((uuid) => ({ uuid }));
}
