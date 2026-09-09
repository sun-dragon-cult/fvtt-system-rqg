/**
 * Types for `@`-routed Active Effect keys (#920).
 *
 * A routed key sends one change to a *different* document than the one the effect sits on:
 *
 *   `@<rqid>:<systemPath>`     one embedded item, best match by rqid
 *   `@~<regex>:<systemPath>`   every embedded item whose rqid matches
 *   `@.:<systemPath>`          the item the effect is parented to
 *
 * Any key not starting with `@` is a native Foundry key and is never touched by this code.
 */

/** Which document(s) a routed key points at. */
export type RoutedSelector =
  | { readonly kind: "rqid"; readonly rqid: string }
  | { readonly kind: "regex"; readonly pattern: string }
  | { readonly kind: "item-local" };

/** Why a routed key could not be parsed. Consumers map these to a localized, actionable warning. */
export type RoutedKeyErrorReason =
  | "missing-path" // no `:` - selector and path must be separated by one
  | "empty-selector" // `@:system.x`
  | "path-not-system" // the part after `:` does not start with `system.`
  | "empty-regex" // `@~:system.x`
  | "invalid-regex" // the regex does not compile
  | "invalid-rqid"; // the selector is neither `.`, `~<regex>`, nor a valid rqid

export interface RoutedKeyError {
  readonly reason: RoutedKeyErrorReason;
  /** Interpolation values for the warning message. */
  readonly detail?: Readonly<Record<string, string>>;
}

export type ParseRoutedKeyResult =
  | { readonly routed: false }
  | { readonly routed: true; readonly selector: RoutedSelector; readonly systemPath: string }
  | { readonly routed: true; readonly error: RoutedKeyError };

/** Why a parsed routed key could not be resolved to a target document. */
export type RoutedTargetErrorReason =
  | "item-local-outside-item" // `@.` on an effect whose parent is not an Item
  | "no-match"; // nothing matched the selector

export interface RoutedTargetError {
  readonly reason: RoutedTargetErrorReason;
  readonly detail?: Readonly<Record<string, string>>;
}

/**
 * The minimal document shape the resolver needs. `RqgActor` and `RqgItem` both satisfy the
 * relevant halves of this, so the resolver stays free of Foundry imports and is trivially
 * testable.
 */
export interface RoutedTargetActorLike {
  getBestEmbeddedDocumentByRqid(rqid: string | undefined): RoutedTargetItemLike | undefined;
  getEmbeddedDocumentsByRqidRegex(pattern: string): RoutedTargetItemLike[];
}

export interface RoutedTargetItemLike {
  readonly id: string | null;
}

export interface RoutedTargetContext {
  /** The actor the effect is being applied against. Absent for effects applied to non-actors. */
  readonly targetActor?: RoutedTargetActorLike | undefined;
  /** The Item the effect is parented to, when it is parented to an Item. */
  readonly owningItem?: RoutedTargetItemLike | undefined;
}

export type ResolveRoutedTargetResult<TItem extends RoutedTargetItemLike = RoutedTargetItemLike> =
  { readonly items: TItem[] } | { readonly error: RoutedTargetError };
