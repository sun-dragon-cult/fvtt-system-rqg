import { safeFromJSON } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { ResistanceRequestChatMessage } from "../../chat/data-model/resistance-request-chat-message.types.ts";
import { casterUuidsOf, spellApplyScope, spellEffectCast } from "./apply-spell-effect";
import { groupEffectsByHook } from "./incoming-spell";
import { spellBehaviorForEffect } from "./spell-behavior";
import { interceptSpellCast, queryActiveGm, type InterceptSpellCastData } from "./run-spell-apply";
import { requestSpellResistance } from "../../data-model/shared/spell-resisted-by";
import { SpellResistedWithEnum } from "../../data-model/item-data/spell";
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
    casterUuid: casterTokenUuid(
      request,
      system.spellCasterUuid || castSystem?.casterTokenOrActorUuid || "",
    ),
    castRoll: (system.castRoll
      ? safeFromJSON<Roll>(Roll, system.castRoll)
      : castMessage?.rolls[0]) as CastRoll | undefined,
  };
}

/**
 * A linked caster is stored as its actor, and the actor's first token would speak the reflected
 * card; the request spoke as the token that cast it.
 */
function casterTokenUuid(request: ResistanceRequestChatMessage, casterUuid: string): string {
  const { scene, token, actor } = request.speaker ?? {};
  return scene && token && casterUuid === `Actor.${actor}`
    ? `Scene.${scene}.Token.${token}`
    : casterUuid;
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
  const targetDoc = fromUuidSync(system.targetTokenOrActorUuid) as TokenDocument | RqgActor | null;
  const targetActor = (
    targetDoc instanceof TokenDocument ? targetDoc.actor : targetDoc
  ) as RqgActor | null;
  const groups = groupEffectsByHook(
    (targetActor?.allApplicableEffects() ?? []) as Iterable<ActiveEffect & { active: boolean }>,
    (effect) => spellBehaviorForEffect(effect)?.onResisted,
  );
  // Nearly every target has nothing that reflects
  if (!targetActor || !groups.size) {
    return;
  }
  // A hidden cast's request names no spell, and its cast message is whispered to the GMs
  if (system.spellCastMessageId && !game.messages?.has(system.spellCastMessageId)) {
    await queryActiveGm("rqg.reflectResistedSpell", { requestId: request.id ?? "" }, "");
    return;
  }
  const { spellUuid, casterUuid, castRoll } = resistedCast(request);
  const spell = spellUuid ? ((await fromUuid(spellUuid)) as RqgItem | null) : null;
  if (!spell || !casterUuid || !castRoll) {
    return;
  }

  const targetName = targetDoc?.name ?? targetActor.name ?? "";
  const scope = spellApplyScope(
    spell,
    targetActor,
    targetName,
    spellEffectCast(spell, castRoll.options, {
      ...casterUuidsOf(casterUuid),
      castMessageId: system.spellCastMessageId || (request.id ?? ""),
      casterSuccessLevel: undefined,
    }),
  );
  for (const [onResisted, effects] of groups) {
    const result = await onResisted({ ...scope, effects });
    if (result?.outcome === "reflected") {
      const stopped = await interceptSpellCast({
        spellUuid: spellUuid,
        targetUuids: [casterUuid],
        rollOptions: castRoll.options as InterceptSpellCastData["rollOptions"],
        casterUuid: casterUuid,
        casterSuccessLevel: undefined,
        reflected: true,
      });
      await requestSpellResistance({
        targetUuid: casterUuid,
        casterUuid: casterUuid,
        resistedWith: SpellResistedWithEnum.Power,
        rollMode: system.rollMode || "public",
        // The caster's POW when they cast it, frozen on the request they sent
        frozenValue: system.activeValue,
        spellCast: {
          castRoll: castRoll as unknown as SpiritMagicRoll | RuneMagicRoll,
          casterTokenOrActorUuid: casterUuid,
          spellUuid: spellUuid,
        },
        reflectedFrom: { messageId: request.id ?? "", reflectorName: targetName },
        // The caster's own protective spells meet it before they resist
        intercepted: stopped.includes(casterUuid),
      });
      return;
    }
  }
}

export function initReflectResistedSpellQuery(): void {
  CONFIG.queries["rqg.reflectResistedSpell"] = async ({ requestId }: { requestId: string }) => {
    const request = game.messages?.get(requestId) as ResistanceRequestChatMessage | undefined;
    if (request) {
      await reflectResistedSpell(request);
    }
  };
}
