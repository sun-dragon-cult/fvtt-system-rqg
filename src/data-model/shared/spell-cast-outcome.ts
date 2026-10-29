import { safeFromJSON } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { calculateAbilitySuccessLevel } from "../../rolls/ability-roll/calculate-ability-success-level";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula";
import { SpellResistedByEnum } from "../item-data/spell";

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
  casterTokenOrActorUuid: string;
  castSuccessLevel: AbilitySuccessLevelEnum | undefined;
  targets: SpellTargetOutcome[];
}

/** A token targeted when the spell was cast. */
export type SpellCastTarget = { tokenUuid: string; isCaster: boolean };

/**
 * The one resistance roll of a `resistanceRollArea` spell (Harmony, Inviolable): the caster's d100
 * read against each target's value, the caster's own token included.
 */
export type AreaResistance = {
  roll: number;
  casterValue: number;
  /** What each target resists with, by token uuid; a target without one stays pending. */
  targetValues: Record<string, number>;
};

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

/**
 * The per-target outcomes known the moment the cast roll lands. Anything a later step decides - a
 * resistance roll, a GM ruling - starts as pending. Nothing targeted means a self cast only for
 * `none`; a resisted spell is against an untargeted opponent the GM rules on - for an area spell,
 * whoever the GM says it reaches, as the caster had no token to measure from.
 */
export function buildCastTargetOutcomes(params: {
  castSuccessLevel: AbilitySuccessLevelEnum;
  resistedBy: SpellResistedByEnum;
  targets: SpellCastTarget[];
  casterTokenOrActorUuid: string;
  areaResistance?: AreaResistance | undefined;
  /** Targets whose protective spells stopped the spell as it was cast. */
  stoppedTargetUuids?: readonly string[] | undefined;
}): SpellTargetOutcome[] {
  const { castSuccessLevel, resistedBy, casterTokenOrActorUuid } = params;
  const untargeted: SpellCastTarget[] =
    resistedBy === SpellResistedByEnum.None
      ? [{ tokenUuid: casterTokenOrActorUuid, isCaster: true }]
      : [{ tokenUuid: "", isCaster: false }];
  const targets = params.targets.length ? params.targets : untargeted;
  const castSucceeded = castSuccessLevel <= AbilitySuccessLevelEnum.Success;

  return targets.map((target) => {
    const settled = (
      state: SpellTargetOutcomeState,
      resolvedBy: SpellTargetOutcomeResolvedBy,
    ): SpellTargetOutcome => ({
      targetTokenOrActorUuid: target.tokenUuid,
      state: state,
      resolvedBy: resolvedBy,
      casterSuccessLevel: castSuccessLevel,
    });

    if (!castSucceeded) {
      return settled("unaffected", "castFailed");
    }
    if (params.stoppedTargetUuids?.includes(target.tokenUuid)) {
      return settled("unaffected", "intercepted");
    }
    const area = params.areaResistance;
    const targetValue = area?.targetValues[target.tokenUuid];
    // The area roll decides the caster's own token too (Inviolable Q&A)
    if (resistedBy === SpellResistedByEnum.ResistanceRollArea && area && targetValue != null) {
      const successLevel = calculateAbilitySuccessLevel(
        computeResistanceTargetChance(area.casterValue, targetValue),
        area.roll,
      );
      return {
        targetTokenOrActorUuid: target.tokenUuid,
        state: successLevel <= AbilitySuccessLevelEnum.Success ? "affected" : "unaffected",
        resolvedBy: "resistanceRoll",
        casterSuccessLevel: successLevel,
      };
    }
    // casting on yourself is accepting the spell (RAW p.242)
    if (target.isCaster) {
      return settled("affected", "selfCast");
    }
    if (resistedBy === SpellResistedByEnum.None) {
      return settled("affected", "castOnly");
    }
    return {
      targetTokenOrActorUuid: target.tokenUuid,
      state: "pending",
      resolvedBy: undefined,
      casterSuccessLevel: undefined,
    };
  });
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
 * The outcome of the spell cast a chat message carries, or undefined when it carries none: a
 * `spellCast` message, or the combined cast + resistance card. A hidden cast's anonymous resistance
 * request is not a cast message - its outcome is read through the whispered `spellCast` message.
 */
export function getSpellCastOutcome(
  message: OutcomeMessage,
  messages: Iterable<OutcomeMessage> = (game.messages ?? []) as Iterable<OutcomeMessage>,
): SpellCastOutcome | undefined {
  const system = message.system;

  if (message.type === "spellCast") {
    const linkedRequests = [...messages].filter(
      (m) => m.type === "resistanceRequest" && m.system.spellCastMessageId === message.id,
    );
    return {
      spellUuid: system.spellUuid,
      casterTokenOrActorUuid: system.casterTokenOrActorUuid,
      castSuccessLevel: system.castSuccessLevel ?? undefined,
      targets: (system.targets as SpellTargetOutcome[]).map((target) => {
        const request = linkedRequests.find(
          (r) => r.system.targetTokenOrActorUuid === target.targetTokenOrActorUuid,
        );
        return request && target.state === "pending"
          ? getResistanceRequestTargetOutcome(request)
          : {
              targetTokenOrActorUuid: target.targetTokenOrActorUuid,
              state: target.state,
              resolvedBy: target.resolvedBy ?? undefined,
              casterSuccessLevel: target.casterSuccessLevel ?? undefined,
            };
      }),
    };
  }

  if (message.type === "resistanceRequest" && system.isSpellCast && system.castRoll) {
    return {
      spellUuid: system.spellUuid,
      casterTokenOrActorUuid: system.spellCasterUuid,
      castSuccessLevel: rollSuccessLevel(system.castRoll),
      targets: [getResistanceRequestTargetOutcome(message)],
    };
  }

  return undefined;
}
