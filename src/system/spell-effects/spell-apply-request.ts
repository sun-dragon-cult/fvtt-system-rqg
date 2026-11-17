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
import {
  isClaimedByOtherApply,
  isOwnedBy,
  releaseApplyClaim,
  takeClaim,
} from "./spell-apply-claims";
import { localize } from "../util";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("SpellApplyRequest", { notify: false });

/** The Apply a GM request belongs to: its cast record's entry, and the click that started it. */
export type SpellApplyRequest = { castMessageId: string; entryId: string; applyId: string };

/**
 * The GM's answer to a request whose entry another Apply took: it holds the entry's claim, or the
 * cast record notes the entry applied or ruled on.
 */
export type SpellApplyTaken = { outcome: "taken" };

/** What the GM answers a request for spell work. */
export type SpellApplyAnswer = SpellEffectApplied | SpellApplyTaken;

const taken: SpellApplyTaken = { outcome: "taken" };

function notifyTaken(spellName: string): void {
  ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.TakenByOtherApply", { spellName }));
}

/** What the GM's answer means for the requesting client, telling its user when the entry was taken. */
export function appliedUnlessTaken(
  answer: SpellApplyAnswer | undefined,
  spellName: string,
): SpellEffectApplied | undefined {
  if (answer?.outcome === "taken") {
    notifyTaken(spellName);
    return undefined;
  }
  return answer;
}

/**
 * Watch, while this client places something for the scope's Apply, for the cast record to note that
 * its entry left the `affected` stage: another client applied it, or a GM ruled on it. Then the
 * signal aborts and the user is told. Without a cast record (token HUD "+") it never aborts.
 */
export function watchApplyTaken(scope: SpellApplyScope): { signal: AbortSignal; stop: () => void } {
  const controller = new AbortController();
  const request = applyRequestOf(scope.cast);
  if (!request) {
    return { signal: controller.signal, stop: () => {} };
  }
  const hookId = Hooks.on("updateChatMessage", (message: ChatMessage) => {
    if (message.id !== request.castMessageId || !isSpellCastRecordMessage(message as any)) {
      return;
    }
    const entry = (message.system as unknown as SpellCastRecord).targets.find(
      (e) => e.id === request.entryId,
    );
    if (entry && entry.stage !== "affected") {
      stop();
      notifyTaken(scope.spell.name ?? "");
      controller.abort();
    }
  });
  const stop = () => Hooks.off("updateChatMessage", hookId);
  return { signal: controller.signal, stop: stop };
}

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
): Promise<SpellApplyAnswer | undefined> {
  const { castMessageId, entryId, applyId } = request;
  const recordEntry = () => {
    const message = game.messages?.get(castMessageId);
    const record =
      message && isSpellCastRecordMessage(message as any)
        ? (message.system as unknown as SpellCastRecord)
        : undefined;
    const entry = record?.targets.find((e) => e.id === entryId);
    return record && entry ? { record, entry } : undefined;
  };
  const before = recordEntry();
  if (before?.entry.stage !== "affected") {
    releaseApplyClaim(castMessageId, entryId);
    logger.warn("Refused spell work for an entry not waiting for Apply", undefined, request);
    return before ? taken : undefined;
  }
  if (isClaimedByOtherApply(castMessageId, entryId, applyId)) {
    logger.warn("Refused spell work for an entry already being applied", undefined, request);
    return taken;
  }
  const [target, spell] = await Promise.all([targetOf(before.entry), castSpellOf(before.record)]);
  if (!spell || !target.actor || !(user.isGM || isOwnedBy(target.token ?? target.actor, user))) {
    logger.warn("Refused spell work for a target the sender doesn't own", undefined, request);
    return undefined;
  }
  // Checked and claimed with nothing awaited in between, so a request arriving meanwhile sees it
  const waiting = recordEntry();
  const claim =
    waiting?.entry.stage === "affected" ? takeClaim(castMessageId, entryId, applyId) : undefined;
  if (!waiting || !claim) {
    logger.warn("Refused spell work for an entry already being applied", undefined, request);
    return waiting ? taken : undefined;
  }
  let result: SpellEffectApplied | undefined;
  try {
    const cast = bindApplyRequest(
      recordCast(waiting.record, castMessageId, spell, waiting.entry),
      request,
    );
    result = await work(
      spellApplyScope(spell, target.actor, target.name, cast, target.token ?? undefined),
    );
    return result;
  } finally {
    claim.finish(!!result);
  }
}

/**
 * The scope of a request with no cast record (the token HUD "+"), taken from the request itself:
 * only when the sender owns its target and the caster it names.
 */
async function requestedApplyScope(
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
): Promise<SpellApplyAnswer | undefined> {
  if (data.request) {
    return runClaimedApply(data.request, user, work);
  }
  const scope = await requestedApplyScope(data, user);
  return scope ? work(scope) : undefined;
}
