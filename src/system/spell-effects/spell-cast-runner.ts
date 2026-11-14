import { safeFromJSON } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  stepSpellCast,
  type SpellCastStepEnv,
  type SpellCastInput,
} from "../../data-model/shared/spell-cast-step";
import {
  canEntryMoveOn,
  isEntryDone,
  isSpellCastRecordMessage,
  spellCastRecordFields,
  type SpellCastEntry,
  type SpellCastRecord,
} from "../../data-model/shared/spell-cast-record";
import { actorRefUuid } from "../../data-model/shared/actor-ref";
import { Rqid } from "../api/rqid-api";
import { SpellResistedWithEnum } from "../../data-model/item-data/spell";
import type { ResistanceRequestChatMessage } from "../../chat/data-model/resistance-request-chat-message.types.ts";
import { spellApplyScope, spellEffectCast, type SpellEffectCast } from "./apply-spell-effect";
import { castAcrossSpellAreas, tokenOfUuid } from "./spell-across";
import { interceptIncomingSpell } from "./incoming-spell";
import { reflectsSpell } from "./reflect-spell";
import { spellBehaviorOf } from "./spell-behavior";
import { queryActiveGm } from "./run-spell-apply";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll";

import { RqgLogger } from "../logging/rqg-logger";
import { ERR } from "../error-registry";

import Roll = foundry.dice.Roll;

const logger = new RqgLogger("SpellCastRunner");

/** A change to a resistance request card that comes with the input, e.g. the roll that answered it. */
export type SpellCastRequestPatch = {
  messageId: string;
  system: Record<string, unknown>;
  whisper?: string[] | undefined;
  blind?: boolean | undefined;
};

/** What a client sends the active GM to continue a cast (#1224). */
export type ContinueSpellCastData = {
  messageId: string;
  inputs: SpellCastInput[];
  requestPatch?: SpellCastRequestPatch | undefined;
};

type RecordMessage = ChatMessage & { system: any };

/**
 * Continue a cast's record on the active GM's client, the only place a cast's state changes: apply
 * the inputs, then move its targets on until each waits for input. A player's client sends it
 * there; without an active GM it warns and the cast waits until a GM logs in.
 */
export async function continueSpellCast(
  messageId: string,
  inputs: SpellCastInput[] = [],
  requestPatch?: SpellCastRequestPatch,
): Promise<void> {
  const data: ContinueSpellCastData = { messageId, inputs, requestPatch };
  if (game.user?.isGM && game.users?.activeGM?.isSelf) {
    await runQueued(data);
    return;
  }
  const message = game.messages?.get(messageId) as RecordMessage | undefined;
  const spell = fromUuidSync((message?.system as any)?.spellUuid ?? "") as { name?: string } | null;
  await queryActiveGm("rqg.continueSpellCast", data, spell?.name ?? "");
}

const queues = new Map<string, Promise<unknown>>();

/** One step per record at a time, so two inputs arriving together can't overwrite each other. */
function runQueued(data: ContinueSpellCastData): Promise<void> {
  const previous = queues.get(data.messageId) ?? Promise.resolve();
  const next = previous
    .then(() => continueOnGm(data))
    .catch((error: unknown) => logger.error(ERR.spellCastNotContinued, { data }, error));
  queues.set(data.messageId, next);
  return next;
}

/**
 * The spell a cast record names: its item, or by its rqid once the item is gone, e.g. with the
 * unlinked token that cast it. A hidden cast's anonymous request names neither.
 */
export async function castSpellOf(names: {
  spellUuid?: string | undefined;
  spellRqid?: string | undefined;
}): Promise<RqgItem | undefined> {
  const spell = names.spellUuid ? ((await fromUuid(names.spellUuid)) as RqgItem | null) : null;
  if (spell || !names.spellRqid) {
    return spell ?? undefined;
  }
  return (await Rqid.fromRqid(names.spellRqid, undefined, true)) as RqgItem | undefined;
}

const recordKeys = ["spellUuid", "spellRqid", ...Object.keys(spellCastRecordFields())];

/** A copy of the cast record a message holds, safe to change. */
function recordOf(message: RecordMessage): SpellCastRecord {
  const system = message.system;
  return foundry.utils.deepClone(
    Object.fromEntries(recordKeys.map((key) => [key, system[key]])),
  ) as SpellCastRecord;
}

/** The cast as a spell effect records it, for one entry of the record. */
export function recordCast(
  record: SpellCastRecord,
  messageId: string,
  spell: RqgItem,
  entry?: SpellCastEntry,
): SpellEffectCast {
  return spellEffectCast(spell, record.castOptions, {
    caster: record.caster,
    castMessageId: messageId,
    casterSuccessLevel: entry?.casterSuccessLevel ?? record.castSuccessLevel ?? undefined,
  });
}

/** An entry's target: its token if it has one, that token's actor, and the name chat text uses. */
export async function targetOf(
  entry: Pick<SpellCastEntry, "actorUuid" | "tokenUuid">,
): Promise<{ actor: RqgActor | null; name: string; token: TokenDocument | null }> {
  const document = await fromUuid(actorRefUuid(entry));
  const token = document instanceof TokenDocument ? document : null;
  const actor = (token ? token.actor : document) as RqgActor | null;
  return {
    actor: actor instanceof Actor ? actor : null,
    name: (document as { name?: string } | null)?.name ?? actor?.name ?? "",
    token: token,
  };
}

/** The cast roll of the record's message, for a reflected request card to show. */
function castRollOf(message: RecordMessage): SpiritMagicRoll | RuneMagicRoll | undefined {
  const roll =
    message.type === "spellCast"
      ? message.rolls[0]
      : safeFromJSON<Roll>(Roll, message.system.castRoll);
  return roll as SpiritMagicRoll | RuneMagicRoll | undefined;
}

/** A resistance answer for an entry that was already answered, e.g. Resist on two clients at once. */
function isLateAnswer(record: SpellCastRecord, data: ContinueSpellCastData): boolean {
  return data.inputs.some(
    (input) =>
      input.kind === "resistance" &&
      record.targets.find((e) => e.id === input.entryId)?.stage !== "resistance",
  );
}

async function continueOnGm(data: ContinueSpellCastData): Promise<void> {
  const message = game.messages?.get(data.messageId) as RecordMessage | undefined;
  if (!message || !isSpellCastRecordMessage(message as any)) {
    return;
  }
  const record = recordOf(message);
  if (isLateAnswer(record, data) || (!data.inputs.length && record.targets.every(isEntryDone))) {
    return;
  }
  const spell = await castSpellOf(record);
  // Dynamic imports to avoid a circular dependency through rqgItem.ts.
  const [{ requestSpellResistance }, { resolveCharacteristicValue }] = await Promise.all([
    import("../../data-model/shared/spell-resisted-by"),
    import("../../applications/resistance-roll-dialog/resistance-roll-shared"),
  ]);
  const actors = new Map<string, Awaited<ReturnType<typeof targetOf>>>();
  const target = async (entry: SpellCastEntry) => {
    const key = actorRefUuid(entry);
    if (!actors.has(key)) {
      actors.set(key, await targetOf(entry));
    }
    return actors.get(key)!;
  };
  await Promise.all(record.targets.filter((e) => e.actorUuid).map(target));

  const env: SpellCastStepEnv = {
    crossAreas: async (entries) => {
      if (spell) {
        await castAcrossSpellAreas(
          spell,
          recordCast(record, message.id ?? "", spell),
          entries.map(actorRefUuid),
        );
      }
    },
    barrierStops: async (entry) => {
      const { actor, name } = await target(entry);
      if (!spell || !actor) {
        return false;
      }
      const scope = spellApplyScope(
        spell,
        actor,
        name,
        recordCast(record, message.id ?? "", spell),
        entry.tokenUuid ? tokenOfUuid(entry.tokenUuid) : undefined,
      );
      return !!(await interceptIncomingSpell(scope, !!entry.reflectedFromId));
    },
    areaTargetValue: (entry) => {
      const actor = actors.get(actorRefUuid(entry))?.actor;
      return actor ? resolveCharacteristicValue(actor, record.resistedWith) : undefined;
    },
    requestResistance: async (entry) => {
      // The combined card is its own target's request
      if (message.type === "resistanceRequest" && message.system.entryId === entry.id) {
        return message.id ?? "";
      }
      const reflectedFrom = entry.reflectedFromId
        ? record.targets.find((e) => e.id === entry.reflectedFromId)
        : undefined;
      const castRoll = castRollOf(message);
      const request = await requestSpellResistance({
        targetUuid: actorRefUuid(entry),
        casterUuid: actorRefUuid(record.caster),
        // A reflected spell attacks its caster's POW with their POW when they cast it (RBM p.71)
        resistedWith: reflectedFrom ? SpellResistedWithEnum.Power : record.resistedWith,
        rollMode: record.castRollMode,
        frozenValue: record.casterPower,
        spellCastMessageId: message.id ?? "",
        entryId: entry.id,
        castFlavor:
          !reflectedFrom && record.castRollMode !== "public" ? castRoll?.flavor : undefined,
        spellCast:
          reflectedFrom && castRoll
            ? {
                castRoll: castRoll,
                casterTokenOrActorUuid: actorRefUuid(record.caster),
                spellUuid: record.spellUuid,
                spellRqid: record.spellRqid,
              }
            : undefined,
        reflectedFrom: reflectedFrom
          ? {
              messageId: reflectedFrom.requestMessageId || (message.id ?? ""),
              reflectorName: (await target(reflectedFrom)).name,
            }
          : undefined,
      });
      return request?.id ?? "";
    },
    notApplied: async (entry, reason) => {
      const { actor, name, token } = await target(entry);
      const onNotApplied = spell ? spellBehaviorOf(spell)?.onNotApplied : undefined;
      if (!spell || !actor || !onNotApplied) {
        return;
      }
      const scope = spellApplyScope(
        spell,
        actor,
        name,
        recordCast(record, message.id ?? "", spell, entry),
        token ?? undefined,
      );
      await onNotApplied({ ...scope, reason: reason });
    },
    reflects: async (entry) => {
      const { actor, name } = await target(entry);
      return !!spell && !!actor
        ? reflectsSpell(spell, actor, name, recordCast(record, message.id ?? "", spell, entry))
        : false;
    },
    newId: () => foundry.utils.randomID(),
  };

  const next = await stepSpellCast(record, data.inputs, env);
  if (!data.requestPatch && foundry.utils.equals(next.targets, record.targets)) {
    return;
  }
  await writeStep(message, next, data);
}

/**
 * Write the record the step produced, and bring the request cards its entries answer on up to date: the
 * answer that came with the input, a GM ruling, and the spell revealed once it takes effect.
 */
async function writeStep(
  message: RecordMessage,
  next: SpellCastRecord,
  data: ContinueSpellCastData,
): Promise<void> {
  const { resistanceRequestUpdate } = await import("../../chat/resistance-request-handlers");
  const rulings = new Map(
    data.inputs.flatMap((input) =>
      input.kind === "ruling" ? [[input.entryId, input.state] as const] : [],
    ),
  );
  let recordWritten = false;
  for (const entry of next.targets.filter((e) => e.requestMessageId)) {
    const request = game.messages?.get(entry.requestMessageId) as
      ResistanceRequestChatMessage | undefined;
    if (!request) {
      continue;
    }
    const isRecord = request.id === message.id;
    const answer = data.requestPatch?.messageId === request.id ? data.requestPatch : undefined;
    const patch: Record<string, unknown> = { ...answer?.system };
    if (isRecord && entry.stage === "resistance" && request.system.state === "Waiting") {
      patch["state"] = "Requested";
    }
    const ruling = rulings.get(entry.id);
    if (ruling) {
      patch["gmRuling"] = ruling;
    }
    // A hidden cast's target only sees the request card, so it shows the applied result too
    if (
      entry.stage === "applied" &&
      !request.system.appliedEffectUuids?.length &&
      !request.system.effectBlockedReason
    ) {
      patch["appliedEffectUuids"] = entry.effectUuids;
      patch["effectBlockedReason"] = entry.effectBlockedReason;
    }
    if (isRecord) {
      patch["targets"] = next.targets;
      recordWritten = true;
    }
    // A spell that takes effect is felt, so the target learns what it was
    const revealSpell = entry.state === "affected" && !!request.system.spellHiddenFromUuid;
    if (!Object.keys(patch).length && !revealSpell) {
      continue;
    }
    // The card's own content doesn't show the record, so its targets alone need no re-render
    if (!revealSpell && !answer && Object.keys(patch).every((key) => key === "targets")) {
      await request.update({ system: patch } as any);
      continue;
    }
    const update = await resistanceRequestUpdate(request, patch, {
      revealSpell: revealSpell,
      whisper: answer?.whisper,
      blind: answer?.blind,
    });
    await request.update(update as ChatMessage.UpdateData);
  }
  if (!recordWritten) {
    await message.update({ system: { targets: next.targets } } as any);
  }
}

/**
 * Continue the casts left waiting at a stage that needs no input, e.g. cast while no GM was logged
 * in. Run when the active GM's client is ready.
 */
export async function resumeSpellCasts(): Promise<void> {
  if (!game.users?.activeGM?.isSelf) {
    return;
  }
  const waiting = (game.messages?.contents ?? []).filter((message) => {
    const targets = isSpellCastRecordMessage(message as any)
      ? ((message.system as any).targets as SpellCastEntry[])
      : [];
    return targets.some(canEntryMoveOn);
  });
  for (const message of waiting) {
    await continueSpellCast(message.id ?? "");
  }
}

/**
 * Give an untargeted entry of a cast its actors, one entry each, which then go on like targeted
 * ones (#1219 builds the GM's picker on this).
 */
export async function assignSpellCastTargets(
  messageId: string,
  entryId: string,
  targets: { actorUuid: string; tokenUuid?: string }[],
): Promise<void> {
  await continueSpellCast(messageId, [
    {
      kind: "assign",
      entryId: entryId,
      targets: targets.map((t) => ({ actorUuid: t.actorUuid, tokenUuid: t.tokenUuid ?? "" })),
    },
  ]);
}

/**
 * The part of a request to continue a cast that its sender may ask for: rulings and assignments
 * from a GM, resistance answers and Apply results from the owner of the entry's target, and the
 * answer's card patch only for the card of an entry they answer.
 */
export function allowedSpellCastData(
  data: ContinueSpellCastData,
  record: Pick<SpellCastRecord, "targets">,
  sender: { isGM: boolean; ownsTarget(entry: SpellCastEntry): boolean },
): ContinueSpellCastData {
  const entryOf = (entryId: string) => record.targets.find((e) => e.id === entryId);
  const inputs = (Array.isArray(data.inputs) ? data.inputs : []).filter((input) => {
    switch (input?.kind) {
      case "ruling":
      case "assign":
        return sender.isGM;
      case "resistance":
      case "applied": {
        const entry = entryOf(input.entryId);
        return !!entry && (sender.isGM || sender.ownsTarget(entry));
      }
      default:
        return false;
    }
  });
  const answered = inputs.flatMap((input) =>
    input.kind === "resistance" ? [entryOf(input.entryId)?.requestMessageId] : [],
  );
  const patch = data.requestPatch;
  return {
    messageId: data.messageId,
    inputs: inputs,
    requestPatch: patch && answered.includes(patch.messageId) ? patch : undefined,
  };
}

/** Continue a cast for a client, with what its sender may ask for. */
export function handleContinueSpellCastQuery(
  data: ContinueSpellCastData,
  { user }: { user: User },
): Promise<void> {
  const message = game.messages?.get(data?.messageId ?? "") as RecordMessage | undefined;
  if (!message || !isSpellCastRecordMessage(message as any)) {
    return Promise.resolve();
  }
  const allowed = allowedSpellCastData(data, recordOf(message), {
    isGM: user.isGM,
    ownsTarget: (entry) =>
      !!(
        fromUuidSync(actorRefUuid(entry)) as {
          testUserPermission?(user: User, level: string): boolean;
        } | null
      )?.testUserPermission?.(user, "OWNER"),
  });
  if (allowed.inputs.length < (data.inputs?.length ?? 0)) {
    logger.warn("Dropped spell cast inputs the sender may not give", { notify: false }, data);
  }
  return runQueued(allowed);
}

export function initContinueSpellCastQuery(): void {
  CONFIG.queries["rqg.continueSpellCast"] = handleContinueSpellCastQuery;
  Hooks.once("ready", () => void resumeSpellCasts());
}
