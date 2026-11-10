/** One stored link. Other properties of a stored link are kept as they are. */
export type RqgLinkFieldEntry = { rqid: string; bonus?: number | null } & Record<string, unknown>;

/** The links in a field value: an array, one link, or nothing. Entries without an rqid are dropped. */
export function toLinks(value: unknown): RqgLinkFieldEntry[] {
  const links: unknown[] = Array.isArray(value) ? value : value ? [value] : [];
  return links.filter(
    (link): link is RqgLinkFieldEntry =>
      typeof (link as { rqid?: unknown } | null)?.rqid === "string" &&
      (link as { rqid: string }).rqid !== "",
  );
}

/** The links in a `value` attribute holding JSON; invalid JSON gives no links. */
export function parseLinks(raw: string | null): RqgLinkFieldEntry[] {
  if (!raw) {
    return [];
  }
  try {
    return toLinks(JSON.parse(raw));
  } catch {
    return [];
  }
}
