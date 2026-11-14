import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  isSpellCastRecordMessage,
  type SpellCastRecord,
} from "../../data-model/shared/spell-cast-record";
import { actorRefUuid } from "../../data-model/shared/actor-ref";
import {
  spellApplyScope,
  type SpellApplyScope,
  type SpellEffectApplied,
  type SpellEffectCast,
} from "./apply-spell-effect";
import { castSpellOf, recordCast, targetOf } from "./spell-cast-runner";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("SpellApplyRequest", { notify: false });

/** The Apply a GM request belongs to: its cast record's entry, and the click that started it. */
export type SpellApplyRequest = { castMessageId: string; entryId: string; applyId: string };

/**
 * What a GM request for spell work carries besides its own data: the Apply it belongs to, or for
 * a spell put on from the token HUD, which has no cast record, the spell, target and cast.
 */
export type SpellApplyRequestData = {
  request?: SpellApplyRequest | undefined;
  spellUuid: string;
  targetActorUuid: string;
  targetName: string;
  cast: SpellEffectCast;
};

// The cast object is what a behavior hands on to summon or createArea, so it carries the request.
const requestsByCast = new WeakMap<SpellEffectCast, SpellApplyRequest>();

export function bindApplyRequest(
  cast: SpellEffectCast,
  request: SpellApplyRequest,
): SpellEffectCast {
  requestsByCast.set(cast, request);
  return cast;
}

export function applyRequestOf(cast: SpellEffectCast): SpellApplyRequest | undefined {
  return requestsByCast.get(cast);
}

/** What a request sends besides its own data, from the scope it was made in. */
export function applyRequestData(scope: SpellApplyScope): SpellApplyRequestData {
  return {
    request: applyRequestOf(scope.cast),
    spellUuid: scope.spell.uuid ?? "",
    targetActorUuid: scope.targetActor.uuid ?? "",
    targetName: scope.targetName,
    cast: scope.cast,
  };
}

type Claim = { applyId: string; running: number; worked: boolean };

/** Entries the active GM is doing spell work for, by `castMessageId.entryId`. */
const claims = new Map<string, Claim>();

function isOwnedBy(document: unknown, user: User): boolean {
  return (
    !!document &&
    (document as { testUserPermission(user: User, level: string): boolean }).testUserPermission(
      user,
      "OWNER",
    )
  );
}

/**
 * Run GM spell work for one Apply, with the scope rebuilt from its cast record: the entry must be
 * waiting for Apply and its target owned by the sender. The entry is claimed before the work
 * starts, so a request from another Apply of the same entry is refused while it runs and, once it
 * did its work, until the record notes it applied. Requests of the same Apply share the claim, e.g.
 * a behavior that summons twice.
 */
export async function runClaimedApply(
  request: SpellApplyRequest,
  user: User,
  work: (scope: SpellApplyScope) => Promise<SpellEffectApplied | undefined>,
): Promise<SpellEffectApplied | undefined> {
  const key = `${request.castMessageId}.${request.entryId}`;
  const message = game.messages?.get(request.castMessageId);
  const record =
    message && isSpellCastRecordMessage(message as any)
      ? (message.system as unknown as SpellCastRecord)
      : undefined;
  const entry = record?.targets.find((e) => e.id === request.entryId);
  if (!record || entry?.stage !== "affected") {
    claims.delete(key);
    logger.warn("Refused spell work for an entry not waiting for Apply", undefined, request);
    return undefined;
  }
  const existing = claims.get(key);
  if (existing && existing.applyId !== request.applyId) {
    logger.warn("Refused spell work for an entry already being applied", undefined, request);
    return undefined;
  }
  // Claimed before anything is awaited, so a request arriving meanwhile sees it
  const claim = existing ?? { applyId: request.applyId, running: 0, worked: false };
  claims.set(key, claim);
  claim.running++;
  try {
    const [target, spell] = await Promise.all([targetOf(entry), castSpellOf(record)]);
    if (!spell || !target.actor || !(user.isGM || isOwnedBy(target.token ?? target.actor, user))) {
      logger.warn("Refused spell work for a target the sender doesn't own", undefined, request);
      return undefined;
    }
    const cast = bindApplyRequest(recordCast(record, request.castMessageId, spell, entry), request);
    const result = await work(
      spellApplyScope(spell, target.actor, target.name, cast, target.token ?? undefined),
    );
    claim.worked ||= !!result;
    return result;
  } finally {
    claim.running--;
    if (!claim.running && !claim.worked && claims.get(key) === claim) {
      claims.delete(key);
    }
  }
}

/**
 * The scope of a request with no cast record (the token HUD "+"), taken from the request itself:
 * only when the sender owns its target and the caster it names.
 */
export async function requestedApplyScope(
  data: SpellApplyRequestData,
  user: User,
): Promise<SpellApplyScope | undefined> {
  const casterUuid = actorRefUuid(data.cast.caster);
  const [spell, targetActor, caster] = await Promise.all([
    fromUuid(data.spellUuid),
    fromUuid(data.targetActorUuid),
    casterUuid ? fromUuid(casterUuid) : Promise.resolve(undefined),
  ]);
  const owned =
    user.isGM || (isOwnedBy(targetActor, user) && (!casterUuid || isOwnedBy(caster, user)));
  if (!spell || !(targetActor instanceof Actor) || !owned) {
    logger.warn("Refused spell work for a target the sender doesn't own", undefined, data);
    return undefined;
  }
  return spellApplyScope(
    spell as RqgItem,
    targetActor as unknown as RqgActor,
    data.targetName,
    data.cast,
  );
}

/** Run GM spell work for a request: by its cast record when it has one, else by its own data. */
export async function runApplyRequest(
  data: SpellApplyRequestData,
  user: User,
  work: (scope: SpellApplyScope) => Promise<SpellEffectApplied | undefined>,
): Promise<SpellEffectApplied | undefined> {
  if (data.request) {
    return runClaimedApply(data.request, user, work);
  }
  const scope = await requestedApplyScope(data, user);
  return scope ? work(scope) : undefined;
}

/** Forget every claim; for tests. */
export function clearApplyClaims(): void {
  claims.clear();
}
