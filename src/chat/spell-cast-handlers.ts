import { getRequiredDomDataset, localize } from "../system/util";
import { templatePaths } from "../system/load-handlebars-templates";
import type { SpellTargetOutcome } from "../data-model/shared/spell-cast-outcome";
import {
  spellTargetRulingState,
  type SpellTargetRulingState,
} from "../data-model/shared/spell-cast-outcome.defs";
import type { ResistanceRequestChatMessage } from "./data-model/resistance-request-chat-message.types.ts";
import { answerResistanceRequest } from "./resistance-request-handlers";

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

/** Target outcome rows, the same on every card that decides a spell. */
export async function renderSpellCastTargets(targets: SpellTargetOutcome[]): Promise<string> {
  const rows = targets.map((target) => {
    const reason = reasonKey(target);
    return {
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
    isGM: !!game.user?.isGM,
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
  if (!message || !spellTargetRulingState.includes(state)) {
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
