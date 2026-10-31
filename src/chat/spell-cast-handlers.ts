import { getDomDataset, getRequiredDomDataset, hasActiveGm, localize } from "../system/util";
import { templatePaths } from "../system/load-handlebars-templates";
import { getResistanceRequestTargetOutcome } from "../data-model/shared/spell-cast-outcome";
import { canApplySpell } from "../system/spell-effects/spell-behavior";
import { Rqid } from "../system/api/rqid-api";
import { applySpellEffect } from "../system/spell-effects/apply-spell-effect";
import { advanceSpellCast, recordCast } from "../system/spell-effects/spell-cast-runner";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellTargetRulingState,
  type SpellTargetOutcomeResolvedBy,
  type SpellTargetOutcomeState,
  type SpellTargetRulingState,
} from "../data-model/shared/spell-cast-outcome.defs";
import { SpellResistedByEnum } from "@item-model/spell.ts";
import {
  entryTargetUuid,
  isSpellCastRecordMessage,
  spellCastRecordMessageOf,
  type SpellCastEntry,
} from "../data-model/shared/spell-cast-record";

const rulingIcons: Record<SpellTargetRulingState, string> = {
  affected: "fa-solid fa-check",
  unaffected: "fa-solid fa-xmark",
  dismissed: "fa-solid fa-ban",
};

/** What the GM rules on for a spirit-combat gate, in place of the generic ruling wording. */
const spiritCombatLabels: Partial<
  Record<
    SpellResistedByEnum,
    { pending: string; ruling: Partial<Record<SpellTargetRulingState, string>> }
  >
> = {
  [SpellResistedByEnum.SpiritCombatRound]: {
    pending: "RQG.ChatMessage.SpellCast.SpiritCombat.PendingRound",
    ruling: {
      affected: "RQG.ChatMessage.SpellCast.SpiritCombat.CasterWonRound",
      unaffected: "RQG.ChatMessage.SpellCast.SpiritCombat.CasterLostRound",
    },
  },
  [SpellResistedByEnum.SpiritCombatDefeat]: {
    pending: "RQG.ChatMessage.SpellCast.SpiritCombat.PendingDefeat",
    ruling: {
      affected: "RQG.ChatMessage.SpellCast.SpiritCombat.CasterDefeatedOpponent",
      unaffected: "RQG.ChatMessage.SpellCast.SpiritCombat.CasterBrokeOff",
    },
  },
};

/** One target row, read off the cast record or, where that isn't visible, the request card. */
type TargetRow = {
  entryId: string;
  targetUuid: string;
  state: SpellTargetOutcomeState;
  resolvedBy: SpellTargetOutcomeResolvedBy | null | undefined;
  effectUuids: string[];
  blockedReason: string;
};

function reasonKey(row: TargetRow): string | undefined {
  if (row.resolvedBy === "resistanceRoll") {
    return row.state === "affected" ? "resistanceOvercame" : "resistanceHeld";
  }
  return row.resolvedBy ?? undefined;
}

function entryRow(entry: SpellCastEntry): TargetRow {
  return {
    entryId: entry.id,
    targetUuid: entryTargetUuid(entry),
    state: entry.state,
    resolvedBy: entry.resolvedBy,
    effectUuids: entry.effectUuids,
    blockedReason: entry.effectBlockedReason,
  };
}

/**
 * The rows a card shows: every entry of the record it holds, or the one entry a request card
 * answers for. A hidden cast's record is whispered to the GMs, so its anonymous request card reads
 * its own answer instead.
 */
function targetRows(message: ChatMessage): TargetRow[] {
  const system = message.system as any;
  if (isSpellCastRecordMessage(message as any)) {
    return (system.targets as SpellCastEntry[]).map(entryRow);
  }
  const record = spellCastRecordMessageOf(message as any);
  const entry = (record?.system as any)?.targets?.find(
    (e: SpellCastEntry) => e.id === system.entryId,
  );
  if (entry) {
    return [entryRow(entry)];
  }
  const outcome = getResistanceRequestTargetOutcome(message as any);
  return outcome.state === "pending"
    ? []
    : [
        {
          entryId: system.entryId ?? "",
          targetUuid: outcome.targetTokenOrActorUuid,
          state: outcome.state,
          resolvedBy: outcome.resolvedBy,
          effectUuids: system.appliedEffectUuids ?? [],
          blockedReason: system.effectBlockedReason ?? "",
        },
      ];
}

/** The spell a card can apply an effect from. A hidden cast's anonymous request names no spell. */
function applicableSpell(message: ChatMessage): RqgItem | undefined {
  const record = spellCastRecordMessageOf(message as any) ?? message;
  const spellUuid = (record.system as any).spellUuid as string | undefined;
  const spell = spellUuid ? (fromUuidSync(spellUuid) as RqgItem | null) : undefined;
  return spell &&
    canApplySpell(Rqid.getDocumentFlag(spell)?.id, (spell.system as any).effectRqidLink)
    ? spell
    : undefined;
}

function isOwnedByUser(uuid: string): boolean {
  return !!uuid && !!(fromUuidSync(uuid) as { isOwner?: boolean } | null)?.isOwner;
}

function targetName(uuid: string, spiritCombat: boolean): string {
  if (!uuid) {
    return localize(
      spiritCombat
        ? "RQG.ChatMessage.SpellCast.SpiritCombat.Opponent"
        : "RQG.ChatMessage.SpellCast.NoTarget",
    );
  }
  return (
    (fromUuidSync(uuid) as { name?: string } | null)?.name ??
    localize("RQG.ChatMessage.SpellCast.UnknownTarget")
  );
}

/** Target outcome rows, the same on every card that decides a spell. */
export async function renderSpellCastTargets(message: ChatMessage): Promise<string> {
  const rows = targetRows(message);
  if (!rows.length) {
    return "";
  }
  const spell = applicableSpell(message);
  const record = spellCastRecordMessageOf(message as any);
  const gateLabels = spiritCombatLabels[(record?.system as any)?.resistedBy as SpellResistedByEnum];
  const viewRows = rows.map((row) => {
    const reason = reasonKey(row);
    const isOwner = isOwnedByUser(row.targetUuid);
    const resolved = row.blockedReason === "resolved";
    const settled = row.effectUuids.length > 0 || !!row.blockedReason;
    return {
      entryId: row.entryId,
      applied: row.effectUuids.length > 0,
      resolved: resolved,
      // A ruling can't undo an effect that's already on the target, or overrule a protective spell.
      canRule:
        !!game.user?.isGM &&
        !!record &&
        !settled &&
        row.resolvedBy !== "intercepted" &&
        row.resolvedBy !== "reflected",
      // Why it was blocked tells what's already on the target, so only its owners see it.
      blockedLabel:
        row.blockedReason && !resolved && isOwner
          ? localize(`RQG.ChatMessage.SpellCast.NotApplied.${row.blockedReason}`)
          : "",
      // Only the target's owner applies it, so a hostile target's items are listed to the GM alone.
      canApply: !!spell && !!record && row.state === "affected" && !settled && isOwner,
      name: targetName(row.targetUuid, !!gateLabels),
      state: row.state,
      stateLabel:
        row.state === "pending" && gateLabels
          ? localize(gateLabels.pending)
          : localize(`RQG.ChatMessage.SpellCast.State.${row.state}`),
      reasonLabel: reason ? localize(`RQG.ChatMessage.SpellCast.Reason.${reason}`) : "",
    };
  });
  return foundry.applications.handlebars.renderTemplate(templatePaths.spellCastTargets, {
    rulings: spellTargetRulingState.map((state) => ({
      state: state,
      icon: rulingIcons[state],
      label: localize(gateLabels?.ruling[state] ?? `RQG.ChatMessage.SpellCast.Ruling.${state}`),
    })),
    decided: viewRows.filter((row) => row.state !== "pending"),
    pending: viewRows.filter((row) => row.state === "pending"),
  });
}

/** The record a clicked row belongs to, and its entry. */
function clickedEntry(
  clickedButton: HTMLButtonElement,
): { record: ChatMessage; entry: SpellCastEntry } | undefined {
  const message = game.messages?.get(getRequiredDomDataset(clickedButton, "message-id"));
  const record = spellCastRecordMessageOf(message as any) as ChatMessage | undefined;
  const entryId = getDomDataset(clickedButton, "entry-id") || (message?.system as any)?.entryId;
  const entry = (record?.system as any)?.targets?.find((e: SpellCastEntry) => e.id === entryId);
  return record && entry ? { record, entry } : undefined;
}

/** GM override of whether a spell took effect on one target, for any resistedBy mode. */
export async function handleSpellCastRuling(clickedButton: HTMLButtonElement): Promise<void> {
  if (!game.user?.isGM) {
    return;
  }
  const state = getRequiredDomDataset(clickedButton, "spell-cast-ruling") as SpellTargetRulingState;
  const clicked = clickedEntry(clickedButton);
  if (!clicked || !spellTargetRulingState.includes(state)) {
    return;
  }
  await advanceSpellCast(clicked.record.id ?? "", [
    { kind: "ruling", entryId: clicked.entry.id, state: state },
  ]);
}

/**
 * Apply a spell to a target it took effect on, once. Runs on the client of whoever clicked (the
 * target's owner, who picks the weapon or the wounds), then the cast record notes what it did.
 */
export async function handleApplySpellEffect(clickedButton: HTMLButtonElement): Promise<void> {
  const clicked = clickedEntry(clickedButton);
  const spell = clicked ? applicableSpell(clicked.record) : undefined;
  if (!clicked || !spell) {
    return;
  }
  const { record, entry } = clicked;
  const targetUuid = entryTargetUuid(entry);
  if (!isOwnedByUser(targetUuid)) {
    return;
  }
  // A stale card can still show the button after someone else applied it.
  if (entry.stage === "applied") {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.AlreadyApplied"));
    return;
  }
  if (entry.stage !== "affected" || !hasActiveGm(spell.name ?? "")) {
    return;
  }

  const targetDoc = await fromUuid(targetUuid);
  const targetActor = (
    targetDoc instanceof TokenDocument ? targetDoc.actor : targetDoc
  ) as RqgActor | null;
  if (!targetActor) {
    return;
  }
  // The token's own name, as the rest of the chat text uses.
  const name = (targetDoc as { name?: string } | null)?.name ?? targetActor.name ?? "";
  const cast = recordCast(record.system as any, record.id ?? "", spell, entry);
  const applied = await applySpellEffect(spell, targetActor, name, cast);
  if (!applied) {
    return;
  }
  await advanceSpellCast(record.id ?? "", [
    {
      kind: "applied",
      entryId: entry.id,
      effectUuids: applied.outcome === "applied" ? applied.effectUuids : [],
      blockedReason:
        applied.outcome === "blocked"
          ? applied.reason
          : applied.outcome === "resolved"
            ? "resolved"
            : "",
    },
  ]);
}
