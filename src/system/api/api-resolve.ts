import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { RqgLogger } from "../logging/rqg-logger";
import { ERR } from "../error-registry";
import { toRqidString } from "./rqid-validation";

const logger = new RqgLogger("Api");

/**
 * An actor, a token (document or placeable), or the uuid, id or name of an actor or token.
 * Leaving it out means the first controlled token, falling back to the user's assigned character.
 */
export type ActorRef = RqgActor | TokenDocument | foundry.canvas.placeables.Token | string;

/** An embedded item, or its id, uuid, rqid or name. */
export type ItemRef = RqgItem | string;

export type ResolvedActor = { actor: RqgActor; token: TokenDocument | null };

export function resolveActor(ref?: ActorRef): ResolvedActor {
  if (ref == null) {
    const controlled = canvas?.tokens?.controlled?.[0];
    if (controlled) {
      return fromTokenDocument(controlled.document);
    }
    const character = game.user?.character as RqgActor | null | undefined;
    if (character) {
      return { actor: character, token: null };
    }
    return logger.throw("No actor given, no token selected and no assigned character");
  }

  let doc: any = ref;
  if (typeof ref === "string") {
    doc = isUuid(ref) ? fromUuidSync(ref) : (game.actors?.get(ref) ?? game.actors?.getName(ref));
    if (!doc) {
      return logger.throw(`No actor or token found for "${ref}"`);
    }
  }
  if (doc.document?.documentName === "Token") {
    doc = doc.document;
  }
  if (doc.documentName === "Token") {
    return fromTokenDocument(doc as TokenDocument);
  }
  if (doc.documentName === "Actor") {
    return { actor: doc as RqgActor, token: (doc as RqgActor).token ?? null };
  }
  return logger.throw(`"${String(ref)}" is not an actor or token`);
}

function isUuid(ref: string): boolean {
  return /^(?:(?:Actor|Scene|Item)\.[a-zA-Z0-9]{16}(?:\.|$)|Compendium\.)/.test(ref);
}

function fromTokenDocument(token: TokenDocument): ResolvedActor {
  const actor = token.actor as RqgActor | null;
  if (!actor) {
    return logger.throw(ERR.tokenHasNoActor, { tokenUuid: token.uuid });
  }
  return { actor, token };
}

/**
 * Find an item embedded on `actor`. A string is tried as id, rqid, uuid and finally as an item
 * name (exact match before case-insensitive). Throws if nothing of the allowed `types` is found.
 */
export function resolveItem<T extends RqgItem = RqgItem>(
  actor: RqgActor,
  ref: ItemRef,
  types: readonly string[],
): T {
  const item = typeof ref === "string" ? findItem(actor, ref, types) : ref;
  if (!item) {
    return logger.throw(`No ${types.join("/")} item "${ref}" found on "${actor.name}"`);
  }
  if (!types.includes(item.type)) {
    return logger.throw(`"${item.name}" is a ${item.type}, expected ${types.join("/")}`);
  }
  return item as T;
}

export function findItem(
  actor: RqgActor,
  ref: string,
  types: readonly string[],
): RqgItem | undefined {
  const byId = actor.items.get(ref) as RqgItem | undefined;
  if (byId) {
    return byId;
  }
  const rqid = toRqidString(ref);
  if (rqid) {
    return actor.getBestEmbeddedDocumentByRqid(rqid);
  }
  if (isUuid(ref)) {
    const byUuid = fromUuidSync(ref) as RqgItem | null;
    if (byUuid?.documentName === "Item") {
      return byUuid;
    }
  }
  const candidates = (actor.items.contents as RqgItem[]).filter((i) => types.includes(i.type));
  const lowerRef = ref.toLowerCase();
  return (
    candidates.find((i) => i.name === ref) ??
    candidates.find((i) => i.name?.toLowerCase() === lowerRef)
  );
}
