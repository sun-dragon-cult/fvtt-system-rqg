import type {
  ResolveRoutedTargetResult,
  RoutedSelector,
  RoutedTargetContext,
  RoutedTargetItemLike,
} from "./routed-key.types";

/**
 * Resolve a parsed routed selector to the target document(s) the change should be applied to.
 *
 * - `item-local` -> the effect's owning Item, or an error when the effect is not on an Item.
 * - `rqid` -> the single best-priority embedded item, or a `no-match` error.
 * - `regex` -> every matching embedded item (id-sorted for deterministic fan-out), or `no-match`.
 *
 * Never throws. Regex validity is already guaranteed by {@link parseRoutedKey}.
 */
export function resolveRoutedTarget(
  selector: RoutedSelector,
  context: RoutedTargetContext,
): ResolveRoutedTargetResult {
  switch (selector.kind) {
    case "item-local": {
      if (!context.owningItem) {
        return { error: { reason: "item-local-outside-item" } };
      }
      return { items: [context.owningItem] };
    }

    case "rqid": {
      const best = context.targetActor?.getBestEmbeddedDocumentByRqid(selector.rqid);
      if (!best) {
        return { error: { reason: "no-match", detail: { selector: `@${selector.rqid}` } } };
      }
      return { items: [best] };
    }

    case "regex": {
      // the actor helper returns a fresh array from `.filter()`, so sorting it in place is safe
      const matches = context.targetActor?.getEmbeddedDocumentsByRqidRegex(selector.pattern) ?? [];
      if (matches.length === 0) {
        return { error: { reason: "no-match", detail: { selector: `@~${selector.pattern}` } } };
      }
      return { items: matches.sort(byId) };
    }
  }
}

function byId(a: RoutedTargetItemLike, b: RoutedTargetItemLike): number {
  const idA = a.id ?? "";
  const idB = b.id ?? "";
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}
