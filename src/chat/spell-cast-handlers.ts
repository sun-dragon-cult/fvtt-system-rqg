import { getRequiredDomDataset, localize, safeFromJSON } from "../system/util";
import { templatePaths } from "../system/load-handlebars-templates";
import {
  getResistanceRequestTargetOutcome,
  getSpellCastOutcome,
  type SpellTargetOutcome,
} from "../data-model/shared/spell-cast-outcome";
import { canApplySpell } from "../system/spell-effects/spell-behaviour";
import { Rqid } from "../system/api/rqid-api";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { applySpellEffect } from "../system/spell-effects/apply-spell-effect";
import { updateChatMessage } from "../sockets/socketable-requests";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellTargetRulingState,
  type SpellTargetRulingState,
} from "../data-model/shared/spell-cast-outcome.defs";
import type { ResistanceRequestChatMessage } from "./data-model/resistance-request-chat-message.types.ts";
import { answerResistanceRequest } from "./resistance-request-handlers";

import Roll = foundry.dice.Roll;

const rulingIcons: Record<SpellTargetRulingState, string> = {
  affected: "fa-solid fa-check",
  unaffected: "fa-solid fa-xmark",
  dismissed: "fa-solid fa-ban",
};

function reasonKey(target: SpellTargetOutcome): string | undefined {
  if (target.resolvedBy === "resistanceRoll") {
    return target.state === "affected" ? "resistanceOvercame" : "resistanceHeld";
  }
  return target.resolvedBy;
}

/** The spell effects already applied to a target from this card. */
/** What Apply did for one target - effect uuids, or why the spell couldn't take effect. */
function appliedEffect(
  message: ChatMessage,
  targetUuid: string,
): { effectUuids: string[]; blockedReason: string } {
  const system = message.system as any;
  const record =
    message.type === "spellCast"
      ? system.targets.find((t: any) => t.targetTokenOrActorUuid === targetUuid)
      : { effectUuids: system.appliedEffectUuids, effectBlockedReason: system.effectBlockedReason };
  return {
    effectUuids: record?.effectUuids ?? [],
    blockedReason: record?.effectBlockedReason ?? "",
  };
}

/** The spell a card can apply an effect from. A hidden cast's anonymous request names no spell. */
function applicableSpell(message: ChatMessage): RqgItem | undefined {
  const spellUuid = (message.system as any).spellUuid as string | undefined;
  const spell = spellUuid ? (fromUuidSync(spellUuid) as RqgItem | null) : undefined;
  return spell &&
    canApplySpell(Rqid.getDocumentFlag(spell)?.id, (spell.system as any).effectRqidLink)
    ? spell
    : undefined;
}

/** Applied, or blocked by what was already on the target - Apply is used up either way. */
function isEffectSettled(message: ChatMessage, targetUuid: string): boolean {
  const { effectUuids, blockedReason } = appliedEffect(message, targetUuid);
  return effectUuids.length > 0 || !!blockedReason;
}

function isOwnedByUser(uuid: string): boolean {
  return !!(fromUuidSync(uuid) as { isOwner?: boolean } | null)?.isOwner;
}

/** Target outcome rows, the same on every card that decides a spell. */
export async function renderSpellCastTargets(
  targets: SpellTargetOutcome[],
  message: ChatMessage,
): Promise<string> {
  const spell = applicableSpell(message);
  const rows = targets.map((target) => {
    const reason = reasonKey(target);
    const { effectUuids, blockedReason } = appliedEffect(message, target.targetTokenOrActorUuid);
    const isOwner = isOwnedByUser(target.targetTokenOrActorUuid);
    const resolved = blockedReason === "resolved";
    return {
      applied: effectUuids.length > 0,
      resolved: resolved,
      // A ruling can't undo an effect that's already on the target, so it stops being offered.
      canRule: !!game.user?.isGM && !effectUuids.length && !blockedReason,
      // Why it was blocked tells what's already on the target, so only its owners see it.
      blockedLabel:
        blockedReason && !resolved && isOwner
          ? localize(`RQG.ChatMessage.SpellCast.NotApplied.${blockedReason}`)
          : "",
      // Only the target's owner applies it, so a hostile target's items are listed to the GM alone.
      canApply:
        !!spell && target.state === "affected" && !effectUuids.length && !blockedReason && isOwner,
      uuid: target.targetTokenOrActorUuid,
      name:
        (fromUuidSync(target.targetTokenOrActorUuid) as { name?: string } | null)?.name ??
        localize("RQG.ChatMessage.SpellCast.UnknownTarget"),
      state: target.state,
      stateLabel: localize(`RQG.ChatMessage.SpellCast.State.${target.state}`),
      reasonLabel: reason ? localize(`RQG.ChatMessage.SpellCast.Reason.${reason}`) : "",
    };
  });
  return foundry.applications.handlebars.renderTemplate(templatePaths.spellCastTargets, {
    rulings: spellTargetRulingState.map((state) => ({
      state: state,
      icon: rulingIcons[state],
      label: localize(`RQG.ChatMessage.SpellCast.Ruling.${state}`),
    })),
    decided: rows.filter((row) => row.state !== "pending"),
    pending: rows.filter((row) => row.state === "pending"),
  });
}

/** GM override of whether a spell took effect on one target, for any resistedBy mode. */
export async function handleSpellCastRuling(clickedButton: HTMLButtonElement): Promise<void> {
  if (!game.user?.isGM) {
    return;
  }
  const state = getRequiredDomDataset(clickedButton, "spell-cast-ruling") as SpellTargetRulingState;
  const targetUuid = getRequiredDomDataset(clickedButton, "target-uuid");
  const message = game.messages?.get(getRequiredDomDataset(clickedButton, "message-id"));
  if (!message || !spellTargetRulingState.includes(state) || isEffectSettled(message, targetUuid)) {
    return;
  }

  if (message.type === "resistanceRequest") {
    await ruleOnResistanceRequest(message as ResistanceRequestChatMessage, state);
    return;
  }
  if (message.type !== "spellCast") {
    return;
  }

  // A hidden cast's target is settled on its request card, so rule there and both cards agree.
  const linkedRequest = game.messages?.find(
    (m) =>
      m.type === "resistanceRequest" &&
      (m as ResistanceRequestChatMessage).system.spellCastMessageId === message.id &&
      (m as ResistanceRequestChatMessage).system.targetTokenOrActorUuid === targetUuid,
  );
  if (linkedRequest) {
    if (isEffectSettled(linkedRequest, targetUuid)) {
      return;
    }
    await ruleOnResistanceRequest(linkedRequest as ResistanceRequestChatMessage, state);
    return;
  }

  const targets = (message.toObject().system as any).targets.map((target: any) =>
    target.targetTokenOrActorUuid === targetUuid
      ? { ...target, state: state, resolvedBy: "gmRuling", casterSuccessLevel: null }
      : target,
  );
  await message.update({ system: { targets: targets } } as any);
}

function ruleOnResistanceRequest(
  request: ResistanceRequestChatMessage,
  state: SpellTargetRulingState,
): Promise<void> {
  // A spell that takes effect is felt, so the target learns what it was.
  return answerResistanceRequest(
    request,
    { gmRuling: state },
    { revealSpell: state === "affected" },
  );
}

/** The cast roll's options: level and points spent. */
function castRollOptions(message: ChatMessage): Record<string, any> {
  const castRoll =
    message.type === "spellCast"
      ? message.rolls[0]
      : safeFromJSON<Roll>(Roll, (message.system as any).castRoll);
  return (castRoll?.options ?? {}) as Record<string, any>;
}

/** Apply a spell's Active Effect to a target the spell took effect on, once. */
export async function handleApplySpellEffect(clickedButton: HTMLButtonElement): Promise<void> {
  const targetUuid = getRequiredDomDataset(clickedButton, "target-uuid");
  const message = game.messages?.get(getRequiredDomDataset(clickedButton, "message-id"));
  const spell = message ? applicableSpell(message) : undefined;
  if (!message || !spell || !isOwnedByUser(targetUuid)) {
    return;
  }
  const outcome =
    message.type === "spellCast"
      ? getSpellCastOutcome(message as any)?.targets.find(
          (t) => t.targetTokenOrActorUuid === targetUuid,
        )
      : getResistanceRequestTargetOutcome(message as any);
  if (outcome?.state !== "affected") {
    return;
  }
  // A stale card can still show the button after someone else applied it.
  if (isEffectSettled(message, targetUuid)) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.AlreadyApplied"));
    return;
  }

  const targetDoc = await fromUuid(targetUuid);
  const targetActor = (
    targetDoc instanceof TokenDocument ? targetDoc.actor : targetDoc
  ) as RqgActor | null;
  if (!targetActor) {
    return;
  }

  const options = castRollOptions(message);
  const level = Number(options["levelUsed"] ?? 0);
  const boost = Number(options["magicPointBoost"] ?? 0);
  const isRuneMagic = spell.type === ItemTypeEnum.RuneMagic;
  // The token's own name, as the rest of the chat text uses.
  const targetName = (targetDoc as { name?: string } | null)?.name ?? targetActor.name ?? "";
  const applied = await applySpellEffect(spell, targetActor, targetName, {
    casterUuid:
      (message.system as any).casterTokenOrActorUuid ??
      (message.system as any).spellCasterUuid ??
      "",
    castMessageId: message.id ?? "",
    level: level,
    magicPointsSpent: isRuneMagic ? boost : level + boost,
    runePointsSpent: isRuneMagic ? level : 0,
    casterSuccessLevel: outcome.casterSuccessLevel,
  });
  if (!applied) {
    return;
  }

  const effectUuids = applied.outcome === "applied" ? applied.effectUuids : [];
  const effectBlockedReason =
    applied.outcome === "blocked"
      ? applied.reason
      : applied.outcome === "resolved"
        ? "resolved"
        : "";
  const systemPatch =
    message.type === "spellCast"
      ? {
          targets: (message.toObject().system as any).targets.map((target: any) =>
            target.targetTokenOrActorUuid === targetUuid
              ? { ...target, effectUuids: effectUuids, effectBlockedReason: effectBlockedReason }
              : target,
          ),
        }
      : { appliedEffectUuids: effectUuids, effectBlockedReason: effectBlockedReason };
  // A target's owner may be neither the author nor a GM, so the author's client records it.
  if (game.user?.isGM || message.isAuthor) {
    await message.update({ system: systemPatch } as any);
  } else {
    await updateChatMessage(message, { system: systemPatch } as any);
  }
}
