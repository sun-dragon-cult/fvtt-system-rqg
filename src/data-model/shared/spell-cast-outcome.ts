import { safeFromJSON } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import {
  entryTargetUuid,
  isSpellCastRecordMessage,
  type SpellCastEntry,
} from "./spell-cast-record";

import Roll = foundry.dice.Roll;

import type {
  SpellTargetOutcomeResolvedBy,
  SpellTargetOutcomeState,
  SpellTargetRulingState,
} from "./spell-cast-outcome.defs";

/** Whether a spell took effect on one of its targets - the one thing a spell effect branches on. */
export interface SpellTargetOutcome {
  /** "" for the untargeted opponent of a spirit-combat gate, which the GM still rules on. */
  targetTokenOrActorUuid: string;
  state: SpellTargetOutcomeState;
  /** How the state was decided; undefined while pending. */
  resolvedBy: SpellTargetOutcomeResolvedBy | undefined;
  /**
   * The CASTER's success level on the roll that decided this target - the cast roll, or the
   * resistance roll, which is the caster's chance to overcome. A "Failure" there means the target
   * held, never that the target rolled badly. Undefined when no roll decided it (accepted, GM
   * ruling, pending).
   */
  casterSuccessLevel: AbilitySuccessLevelEnum | undefined;
}

/**
 * The contract between casting and spell effects (#1078): what was cast, by whom, and how it went
 * for each target. Read it with {@link getSpellCastOutcome}; never branch on `resistedBy`.
 */
export interface SpellCastOutcome {
  spellUuid: string;
  casterActorUuid: string;
  casterTokenUuid: string;
  castSuccessLevel: AbilitySuccessLevelEnum | undefined;
  targets: (SpellTargetOutcome & { entryId: string })[];
}

/**
 * The highest value an area resistance roll overcomes: "all" on 5 or less, "none" on 96 or more or
 * below the lowest value a target can have, otherwise by the resistance table. RBM's Inviolable
 * reads the table the other way round; this follows Harmony and every other resistance roll.
 */
export function areaResistanceThreshold(
  casterValue: number,
  roll: number,
  lowestValue: number,
): number | "all" | "none" {
  if (roll <= 5) {
    return "all";
  }
  const threshold = casterValue + Math.floor((50 - roll) / 5);
  return roll >= 96 || threshold < lowestValue ? "none" : threshold;
}

type ResistanceRequestOutcomeSource = {
  state: string;
  targetTokenOrActorUuid: string;
  gmRuling?: SpellTargetRulingState | "" | undefined;
};

/** The outcome a resistance request card settles, read off its state rather than stored twice. */
export function deriveResistanceRequestTargetOutcome(
  request: ResistanceRequestOutcomeSource,
  resistanceSuccessLevel: AbilitySuccessLevelEnum | undefined,
): SpellTargetOutcome {
  const base = { targetTokenOrActorUuid: request.targetTokenOrActorUuid };
  if (request.gmRuling) {
    return {
      ...base,
      state: request.gmRuling,
      resolvedBy: "gmRuling",
      casterSuccessLevel: undefined,
    };
  }
  switch (request.state) {
    case "Accepted":
      return { ...base, state: "affected", resolvedBy: "accepted", casterSuccessLevel: undefined };
    case "Rolled": {
      // the resistance roll is the caster's, so success means the spell got through
      const overcame =
        resistanceSuccessLevel != null && resistanceSuccessLevel <= AbilitySuccessLevelEnum.Success;
      return {
        ...base,
        state: overcame ? "affected" : "unaffected",
        resolvedBy: "resistanceRoll",
        casterSuccessLevel: resistanceSuccessLevel,
      };
    }
    default:
      return { ...base, state: "pending", resolvedBy: undefined, casterSuccessLevel: undefined };
  }
}

type OutcomeMessage = {
  id: string | null;
  type: string;
  system: any;
};

function rollSuccessLevel(json: unknown): AbilitySuccessLevelEnum | undefined {
  return safeFromJSON<Roll & { successLevel?: AbilitySuccessLevelEnum }>(Roll, json)?.successLevel;
}

export function getResistanceRequestTargetOutcome(request: OutcomeMessage): SpellTargetOutcome {
  return deriveResistanceRequestTargetOutcome(
    request.system,
    rollSuccessLevel(request.system.resistanceRoll),
  );
}

/**
 * The outcome of the spell cast a chat message holds the record of (#1224): a `spellCast` card, or
 * the combined cast card. A request card that only answers for a target holds none.
 */
export function getSpellCastOutcome(message: OutcomeMessage): SpellCastOutcome | undefined {
  if (!isSpellCastRecordMessage(message)) {
    return undefined;
  }
  const system = message.system;
  return {
    spellUuid: system.spellUuid,
    casterActorUuid: system.casterActorUuid,
    casterTokenUuid: system.casterTokenUuid,
    castSuccessLevel: system.castSuccessLevel ?? undefined,
    targets: (system.targets as SpellCastEntry[]).map((entry) => ({
      entryId: entry.id,
      targetTokenOrActorUuid: entryTargetUuid(entry),
      state: entry.state,
      resolvedBy: entry.resolvedBy ?? undefined,
      casterSuccessLevel: (entry.casterSuccessLevel ?? undefined) as
        AbilitySuccessLevelEnum | undefined,
    })),
  };
}
