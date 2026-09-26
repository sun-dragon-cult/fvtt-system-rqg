import { safeFromJSON } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { SpellResistedByEnum } from "../item-data/spell";

import Roll = foundry.dice.Roll;

import type {
  SpellTargetOutcomeResolvedBy,
  SpellTargetOutcomeState,
} from "./spell-cast-outcome.defs";

/** Whether a spell took effect on one of its targets - the one thing a spell effect branches on. */
export interface SpellTargetOutcome {
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
 * The per-target outcomes known the moment the cast roll lands. Anything a later step decides - a
 * resistance roll, a GM ruling - starts as pending. Nothing targeted means a self cast only for
 * `none` and `resistanceRoll` (whose caster confirmed it); an area or spirit-combat spell without
 * targets has no target yet, not the caster.
 */
export function buildCastTargetOutcomes(params: {
  castSuccessLevel: AbilitySuccessLevelEnum;
  resistedBy: SpellResistedByEnum;
  targets: SpellCastTarget[];
  casterTokenOrActorUuid: string;
}): SpellTargetOutcome[] {
  const { castSuccessLevel, resistedBy, casterTokenOrActorUuid } = params;
  const defaultsToSelf =
    resistedBy === SpellResistedByEnum.None || resistedBy === SpellResistedByEnum.ResistanceRoll;
  const targets =
    params.targets.length || !defaultsToSelf
      ? params.targets
      : [{ tokenUuid: casterTokenOrActorUuid, isCaster: true }];
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
};

/** The outcome a resistance request card settles, read off its state rather than stored twice. */
export function deriveResistanceRequestTargetOutcome(
  request: ResistanceRequestOutcomeSource,
  resistanceSuccessLevel: AbilitySuccessLevelEnum | undefined,
): SpellTargetOutcome {
  const base = { targetTokenOrActorUuid: request.targetTokenOrActorUuid };
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

function outcomeFromResistanceRequest(request: OutcomeMessage): SpellTargetOutcome {
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
          ? outcomeFromResistanceRequest(request)
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
      targets: [outcomeFromResistanceRequest(message)],
    };
  }

  return undefined;
}
