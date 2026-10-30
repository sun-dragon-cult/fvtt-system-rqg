import { safeFromJSON } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { ResistanceRequestChatMessage } from "../../chat/data-model/resistance-request-chat-message.types.ts";
import { spellApplyScope, spellEffectCast } from "./apply-spell-effect";
import { groupEffectsByHook } from "./incoming-spell";
import { spellBehaviorForEffect } from "./spell-behavior";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll";

import Roll = foundry.dice.Roll;

type CastRoll = Roll & { options: Record<string, unknown> };

/** The spell, caster and cast roll a spell's resistance request settles - its own, or its cast message's. */
function resistedCast(request: ResistanceRequestChatMessage): {
  spellUuid: string;
  casterUuid: string;
  castRoll: CastRoll | undefined;
} {
  const system = request.system;
  const castMessage = system.spellCastMessageId
    ? game.messages?.get(system.spellCastMessageId)
    : undefined;
  const castSystem = castMessage?.system as
    { spellUuid?: string; casterTokenOrActorUuid?: string } | undefined;
  return {
    spellUuid: system.spellUuid || castSystem?.spellUuid || "",
    casterUuid: system.spellCasterUuid || castSystem?.casterTokenOrActorUuid || "",
    castRoll: (system.castRoll
      ? safeFromJSON<Roll>(Roll, system.castRoll)
      : castMessage?.rolls[0]) as CastRoll | undefined,
  };
}

/**
 * After a target's resistance roll held against a spell, run the `onResisted` hooks of the
 * target's spell effects (Reflection, RBM p.71). One that reflects it gets a new resistance request
 * aimed at the caster: their POW when they cast it against their POW now. A reflected spell is never
 * reflected again.
 */
export async function reflectResistedSpell(request: ResistanceRequestChatMessage): Promise<void> {
  const system = request.system;
  if (!system.isSpellCast || system.reflectedFromMessageId) {
    return;
  }
  // A hidden cast's request names no spell, and its cast message is whispered to the GMs
  if (system.spellCastMessageId && !game.messages?.has(system.spellCastMessageId)) {
    await game.users?.activeGM?.query("rqg.reflectResistedSpell", { requestId: request.id ?? "" });
    return;
  }
  const { spellUuid, casterUuid, castRoll } = resistedCast(request);
  const [spell, targetDoc] = await Promise.all([
    spellUuid ? (fromUuid(spellUuid) as Promise<RqgItem | null>) : null,
    fromUuid(system.targetTokenOrActorUuid) as Promise<TokenDocument | RqgActor | null>,
  ]);
  const targetActor = (
    targetDoc instanceof TokenDocument ? targetDoc.actor : targetDoc
  ) as RqgActor | null;
  if (!spell || !casterUuid || !castRoll || !targetActor) {
    return;
  }

  const targetName = targetDoc?.name ?? targetActor.name ?? "";
  const scope = spellApplyScope(
    spell,
    targetActor,
    targetName,
    spellEffectCast(spell, castRoll.options, {
      casterUuid: casterUuid,
      castMessageId: system.spellCastMessageId || (request.id ?? ""),
      casterSuccessLevel: undefined,
    }),
  );
  const groups = groupEffectsByHook(
    targetActor.allApplicableEffects() as Iterable<ActiveEffect & { active: boolean }>,
    (effect) => spellBehaviorForEffect(effect)?.onResisted,
  );
  for (const [onResisted, effects] of groups) {
    const result = await onResisted({ ...scope, effects });
    if (result?.outcome === "reflected") {
      await reflectAtCaster(request, castRoll, spellUuid, casterUuid, targetName);
      return;
    }
  }
}

async function reflectAtCaster(
  request: ResistanceRequestChatMessage,
  castRoll: CastRoll,
  spellUuid: string,
  casterUuid: string,
  reflectorName: string,
): Promise<void> {
  // Dynamic imports to avoid a circular dependency through rqgItem.ts.
  const [{ createResistanceRequest }, { resolveCharacteristicSide }] = await Promise.all([
    import("../../applications/resistance-roll-dialog/create-resistance-request"),
    import("../../applications/resistance-roll-dialog/resistance-roll-shared"),
  ]);
  const system = request.system;
  const caster = resolveCharacteristicSide(casterUuid, "power", "", 0, "");
  await createResistanceRequest({
    targetTokenOrActorUuid: casterUuid,
    rollerSide: "passive",
    rollerCharacteristics: "power",
    // The caster's POW when they cast it, frozen on the request they sent
    frozenValue: system.activeValue,
    frozenCharacteristics: "power",
    frozenActorName: caster.actorName,
    activeLabel: caster.label,
    passiveLabel: caster.label,
    otherModifier: 0,
    rollMode: system.rollMode || "public",
    allowVoluntaryAccept: true,
    isSpellCast: true,
    description: undefined,
    spellCast: {
      castRoll: castRoll as unknown as SpiritMagicRoll | RuneMagicRoll,
      casterTokenOrActorUuid: casterUuid,
      spellUuid: spellUuid,
    },
    reflectedFrom: { messageId: request.id ?? "", reflectorName: reflectorName },
  });
}

export function initReflectResistedSpellQuery(): void {
  CONFIG.queries["rqg.reflectResistedSpell"] = async ({ requestId }: { requestId: string }) => {
    const request = game.messages?.get(requestId) as ResistanceRequestChatMessage | undefined;
    if (request) {
      await reflectResistedSpell(request);
    }
  };
}
