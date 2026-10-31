import { safeFromJSON } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  advanceSpellCastRecord,
  type SpellCastAdvanceEnv,
  type SpellCastInput,
} from "../../data-model/shared/spell-cast-advance";
import {
  entryTargetUuid,
  isSpellCastRecordMessage,
  type SpellCastEntry,
  type SpellCastRecord,
} from "../../data-model/shared/spell-cast-record";
import { SpellResistedWithEnum } from "../../data-model/item-data/spell";
import type { ResistanceRequestChatMessage } from "../../chat/data-model/resistance-request-chat-message.types.ts";
import {
  casterDocumentUuid,
  spellApplyScope,
  spellEffectCast,
  type SpellEffectCast,
} from "./apply-spell-effect";
import { castAcrossSpellAreas } from "./spell-across";
import { interceptIncomingSpell } from "./incoming-spell";
import { reflectsSpell } from "./reflect-spell";
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

/** What a client sends the active GM to advance a cast (#1224). */
export type AdvanceSpellCastData = {
  messageId: string;
  inputs: SpellCastInput[];
  requestPatch?: SpellCastRequestPatch | undefined;
};

type RecordMessage = ChatMessage & { system: any };

/**
 * Advance a cast's record on the active GM's client, the only place a cast's state changes: apply
 * the inputs, then move its targets on until each waits for input. A player's client sends it
 * there; without an active GM it warns and the cast waits until a GM logs in.
 */
export async function advanceSpellCast(
  messageId: string,
  inputs: SpellCastInput[] = [],
  requestPatch?: SpellCastRequestPatch,
): Promise<void> {
  const data: AdvanceSpellCastData = { messageId, inputs, requestPatch };
  if (game.user?.isGM && game.users?.activeGM?.isSelf) {
    await runQueued(data);
    return;
  }
  const message = game.messages?.get(messageId) as RecordMessage | undefined;
  const spell = fromUuidSync((message?.system as any)?.spellUuid ?? "") as { name?: string } | null;
  await queryActiveGm("rqg.advanceSpellCast", data, spell?.name ?? "");
}

const queues = new Map<string, Promise<unknown>>();

/** One advance per record at a time, so two inputs arriving together can't overwrite each other. */
function runQueued(data: AdvanceSpellCastData): Promise<void> {
  const previous = queues.get(data.messageId) ?? Promise.resolve();
  const next = previous
    .then(() => advanceOnGm(data))
    .catch((error: unknown) => logger.error(ERR.spellCastNotAdvanced, { data }, error));
  queues.set(data.messageId, next);
  return next;
}

function recordOf(message: RecordMessage): SpellCastRecord {
  const s = message.system;
  return {
    spellUuid: s.spellUuid,
    casterActorUuid: s.casterActorUuid,
    casterTokenUuid: s.casterTokenUuid,
    casterPower: s.casterPower,
    castSuccessLevel: s.castSuccessLevel ?? null,
    resistedBy: s.resistedBy,
    resistedWith: s.resistedWith,
    castRollMode: s.castRollMode,
    castOptions: { ...s.castOptions },
    areaRoll: s.areaRoll ? { ...s.areaRoll } : null,
    targets: (s.targets ?? []).map((entry: SpellCastEntry) => ({ ...entry })),
  };
}

/** The cast as a spell effect records it, for one entry of the record. */
export function recordCast(
  record: SpellCastRecord,
  messageId: string,
  spell: RqgItem,
  entry?: SpellCastEntry,
): SpellEffectCast {
  return spellEffectCast(spell, record.castOptions, {
    casterActorUuid: record.casterActorUuid,
    casterTokenUuid: record.casterTokenUuid,
    castMessageId: messageId,
    casterSuccessLevel: entry?.casterSuccessLevel ?? record.castSuccessLevel ?? undefined,
  });
}

async function targetOf(
  entry: SpellCastEntry,
): Promise<{ actor: RqgActor | null; name: string; token: TokenDocument | null }> {
  const document = await fromUuid(entryTargetUuid(entry));
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

async function advanceOnGm(data: AdvanceSpellCastData): Promise<void> {
  const message = game.messages?.get(data.messageId) as RecordMessage | undefined;
  if (!message || !isSpellCastRecordMessage(message as any)) {
    return;
  }
  const record = recordOf(message);
  const spell = (await fromUuid(record.spellUuid)) as RqgItem | null;
  // Dynamic imports to avoid a circular dependency through rqgItem.ts.
  const [{ requestSpellResistance }, { resolveCharacteristicValue }] = await Promise.all([
    import("../../data-model/shared/spell-resisted-by"),
    import("../../applications/resistance-roll-dialog/resistance-roll-shared"),
  ]);
  const actors = new Map<string, Awaited<ReturnType<typeof targetOf>>>();
  const target = async (entry: SpellCastEntry) => {
    const key = entryTargetUuid(entry);
    if (!actors.has(key)) {
      actors.set(key, await targetOf(entry));
    }
    return actors.get(key)!;
  };
  for (const entry of record.targets.filter((e) => e.actorUuid)) {
    await target(entry);
  }

  const env: SpellCastAdvanceEnv = {
    crossAreas: async (entries) => {
      if (spell) {
        await castAcrossSpellAreas(
          spell,
          recordCast(record, message.id ?? "", spell),
          entries.map(entryTargetUuid),
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
      );
      return !!(await interceptIncomingSpell(scope, !!entry.reflectedFromId));
    },
    areaTargetValue: (entry) => {
      const actor = actors.get(entryTargetUuid(entry))?.actor;
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
        targetUuid: entryTargetUuid(entry),
        casterUuid: casterDocumentUuid(record),
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
                casterTokenOrActorUuid: casterDocumentUuid(record),
                spellUuid: record.spellUuid,
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
    reflects: async (entry) => {
      const { actor, name } = await target(entry);
      return !!spell && !!actor
        ? reflectsSpell(spell, actor, name, recordCast(record, message.id ?? "", spell, entry))
        : false;
    },
    newId: () => foundry.utils.randomID(),
  };

  const next = await advanceSpellCastRecord(record, data.inputs, env);
  await writeAdvance(message, next, data);
}

/**
 * Write the advanced record, and bring the request cards its entries answer on up to date: the
 * answer that came with the input, a GM ruling, and the spell revealed once it takes effect.
 */
async function writeAdvance(
  message: RecordMessage,
  next: SpellCastRecord,
  data: AdvanceSpellCastData,
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
    if (isRecord) {
      patch["targets"] = next.targets;
      recordWritten = true;
    }
    // A spell that takes effect is felt, so the target learns what it was
    const revealSpell = entry.state === "affected" && !!request.system.spellHiddenFromUuid;
    if (!Object.keys(patch).length && !revealSpell) {
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
 * Advance the casts left waiting at a stage that needs no input, e.g. cast while no GM was logged
 * in. Run when the active GM's client is ready.
 */
export async function resumeSpellCasts(): Promise<void> {
  if (!game.users?.activeGM?.isSelf) {
    return;
  }
  const passing = ["crossing", "barriers", "resisted"];
  const waiting = (game.messages?.contents ?? []).filter((message) => {
    const targets = isSpellCastRecordMessage(message as any)
      ? ((message.system as any).targets as SpellCastEntry[])
      : [];
    return targets.some(
      (e) => passing.includes(e.stage) || (e.stage === "targeted" && !!e.actorUuid),
    );
  });
  for (const message of waiting) {
    await advanceSpellCast(message.id ?? "");
  }
}

export function initAdvanceSpellCastQuery(): void {
  CONFIG.queries["rqg.advanceSpellCast"] = (data: AdvanceSpellCastData) => runQueued(data);
  Hooks.once("ready", () => void resumeSpellCasts());
}
