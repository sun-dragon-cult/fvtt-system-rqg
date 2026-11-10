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

/** The entries in a `value` attribute holding JSON; invalid JSON gives no entries. */
export function parseLinks(raw: string | null, linkKey?: string): RqgLinkFieldEntry[] {
  if (!raw) {
    return [];
  }
  try {
    return toLinks(JSON.parse(raw), linkKey);
  } catch {
    return [];
  }
}
