import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { calculateAbilitySuccessLevel } from "../../rolls/ability-roll/calculate-ability-success-level";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula";
import { isResistanceRoll, isSpiritCombatGate, SpellResistedByEnum } from "../item-data/spell";
import type {
  SpellTargetOutcomeResolvedBy,
  SpellTargetRulingState,
} from "./spell-cast-outcome.defs";
import {
  newSpellCastEntry,
  type SpellCastEntry,
  type SpellCastRecord,
  type SpellCastTarget,
} from "./spell-cast-record";

/** What a player or the GM tells the runner about one entry. */
export type SpellCastInput =
  | {
      kind: "resistance";
      entryId: string;
      result: "accepted" | "overcame" | "held";
      casterSuccessLevel?: number | undefined;
    }
  | { kind: "ruling"; entryId: string; state: SpellTargetRulingState }
  | { kind: "applied"; entryId: string; effectUuids: string[]; blockedReason: string }
  | { kind: "assign"; entryId: string; targets: Omit<SpellCastTarget, "isCaster">[] };

/** Why a spell did not take effect on a target, as its `onNotApplied` hook is told. */
export type SpellNotAppliedReason = "castFailed" | "resisted" | "blocked";

/** What the runner needs from the world, so the stages can be tested without Foundry. */
export type SpellCastStepEnv = {
  /** Run the spell areas crossed on the way to these entries, once per area. */
  crossAreas(entries: SpellCastEntry[]): Promise<void>;
  /** Whether the entry's protective spells stop the spell. */
  barrierStops(entry: SpellCastEntry): Promise<boolean>;
  /** What the entry resists an area roll with; undefined when it can't be read. */
  areaTargetValue(entry: SpellCastEntry): number | undefined;
  /** Give the entry a resistance request card to answer on, and return that card's id. */
  requestResistance(entry: SpellCastEntry): Promise<string>;
  /** Tell the spell it did not take effect on the entry's target. */
  notApplied(entry: SpellCastEntry, reason: SpellNotAppliedReason): Promise<void>;
  /** Whether one of the entry's spell effects sends the spell back at its caster. */
  reflects(entry: SpellCastEntry): Promise<boolean>;
  newId(): string;
};

/**
 * Apply `inputs` to a cast's record, then move every entry on through the stages that complete at
 * once, stopping where one waits for input (#1224). Returns a new record; `record` isn't changed.
 */
export async function stepSpellCast(
  record: SpellCastRecord,
  inputs: readonly SpellCastInput[],
  env: SpellCastStepEnv,
): Promise<SpellCastRecord> {
  const next: SpellCastRecord = { ...record, targets: record.targets.map((e) => ({ ...e })) };
  for (const input of inputs) {
    applyInput(next, input, env);
  }
  // Each entry is asked once per step, even when no card could be made
  const asked = new Set<string>();
  const once: SpellCastStepEnv = {
    ...env,
    requestResistance: async (entry) => {
      if (asked.has(entry.id)) {
        return "";
      }
      asked.add(entry.id);
      return env.requestResistance(entry);
    },
  };
  // Each pass moves every entry at least one stage or stops; a reflection adds an entry
  let passes = 0;
  while (passes++ < 20 && (await stepOnce(next, once))) {
    // keep going until every entry waits for input or is done
  }
  return next;
}

function settle(
  entry: SpellCastEntry,
  state: "affected" | "unaffected" | "dismissed",
  resolvedBy: SpellTargetOutcomeResolvedBy,
  casterSuccessLevel: number | null = null,
): void {
  entry.stage = state === "affected" ? "affected" : "settled";
  entry.state = state;
  entry.resolvedBy = resolvedBy;
  entry.casterSuccessLevel = casterSuccessLevel;
}

function applyInput(record: SpellCastRecord, input: SpellCastInput, env: SpellCastStepEnv) {
  const index = record.targets.findIndex((e) => e.id === input.entryId);
  const entry = record.targets[index];
  if (!entry) {
    return;
  }
  switch (input.kind) {
    case "resistance": {
      if (entry.stage !== "resistance") {
        return;
      }
      const level = input.casterSuccessLevel ?? null;
      if (input.result === "accepted") {
        settle(entry, "affected", "accepted");
      } else if (input.result === "overcame") {
        settle(entry, "affected", "resistanceRoll", level);
      } else {
        entry.stage = "resisted";
        entry.resolvedBy = "resistanceRoll";
        entry.casterSuccessLevel = level;
      }
      return;
    }
    case "ruling": {
      // An applied effect stays, and a protective spell's stop or reflection isn't overruled
      if (
        entry.stage === "applied" ||
        entry.resolvedBy === "intercepted" ||
        entry.resolvedBy === "reflected"
      ) {
        return;
      }
      if (input.state === "affected") {
        settle(entry, "affected", "gmRuling");
      } else if (
        input.state === "unaffected" &&
        entry.stage === "resistance" &&
        !entry.reflectedFromId &&
        isResistanceRoll(record.resistedBy)
      ) {
        // Resisted by ruling is resisted all the same, so Reflection can still send it back
        entry.stage = "resisted";
        entry.resolvedBy = "gmRuling";
        entry.casterSuccessLevel = null;
      } else {
        settle(entry, input.state, "gmRuling");
      }
      return;
    }
    case "applied": {
      if (entry.stage !== "affected") {
        return;
      }
      entry.stage = "applied";
      entry.effectUuids = input.effectUuids;
      entry.effectBlockedReason = input.blockedReason;
      return;
    }
    case "assign": {
      if (entry.actorUuid || entry.stage !== "targeted" || !input.targets.length) {
        return;
      }
      const assigned = input.targets.map((target, i) =>
        newSpellCastEntry(i === 0 ? entry.id : env.newId(), {
          ...target,
          isCaster: target.actorUuid === record.caster.actorUuid,
        }),
      );
      record.targets.splice(index, 1, ...assigned);
      return;
    }
  }
}

/** One pass over the stages; true when anything changed. */
async function stepOnce(record: SpellCastRecord, env: SpellCastStepEnv): Promise<boolean> {
  let changed = false;
  const at = (stage: SpellCastEntry["stage"]) => record.targets.filter((e) => e.stage === stage);

  // An untargeted entry waits here for the GM to assign actors
  for (const entry of at("failed")) {
    entry.stage = "settled";
    await env.notApplied(entry, "castFailed");
    changed = true;
  }

  for (const entry of at("targeted").filter((e) => e.actorUuid)) {
    // A target's own defenses don't stop a spell it casts on itself (Core Q&A)
    entry.stage = entry.isCaster ? "resistance" : "crossing";
    changed = true;
  }

  const crossing = at("crossing");
  if (crossing.length) {
    await env.crossAreas(crossing);
    crossing.forEach((entry) => (entry.stage = "barriers"));
    changed = true;
  }

  for (const entry of at("barriers")) {
    if (await env.barrierStops(entry)) {
      settle(entry, "unaffected", "intercepted");
      await env.notApplied(entry, "blocked");
    } else {
      entry.stage = "resistance";
    }
    changed = true;
  }

  for (const entry of at("resistance").filter((e) => e.state === "pending")) {
    changed = (await resist(record, entry, env)) || changed;
  }

  for (const entry of at("resisted")) {
    const resolvedBy = entry.resolvedBy ?? "resistanceRoll";
    // A reflected spell is never reflected again
    if (!entry.reflectedFromId && (await env.reflects(entry))) {
      settle(entry, "unaffected", "reflected", entry.casterSuccessLevel);
      record.targets.push({
        ...newSpellCastEntry(env.newId(), {
          ...record.caster,
          isCaster: true,
        }),
        stage: "barriers",
        reflectedFromId: entry.id,
      });
    } else {
      settle(entry, "unaffected", resolvedBy, entry.casterSuccessLevel);
      await env.notApplied(entry, "resisted");
    }
    changed = true;
  }
  return changed;
}

/** The resistance stage of one entry; true when it moved on or got a request card. */
async function resist(
  record: SpellCastRecord,
  entry: SpellCastEntry,
  env: SpellCastStepEnv,
): Promise<boolean> {
  const resistedBy = record.resistedBy;
  const reflected = !!entry.reflectedFromId;
  // The area roll decides the caster's own token too (Inviolable Q&A)
  if (resistedBy === SpellResistedByEnum.ResistanceRollArea && !reflected && record.areaRoll) {
    const value = env.areaTargetValue(entry);
    if (value == null) {
      return false;
    }
    const level = calculateAbilitySuccessLevel(
      computeResistanceTargetChance(record.areaRoll.casterValue, value),
      record.areaRoll.roll,
    );
    const held = level > AbilitySuccessLevelEnum.Success;
    settle(entry, held ? "unaffected" : "affected", "resistanceRoll", level);
    if (held) {
      await env.notApplied(entry, "resisted");
    }
    return true;
  }
  // Casting on yourself is accepting the spell (Core p.242)
  if (entry.isCaster && !reflected) {
    settle(entry, "affected", "selfCast");
    return true;
  }
  if (!reflected && resistedBy === SpellResistedByEnum.None) {
    settle(entry, "affected", "castOnly");
    return true;
  }
  // Spirit combat, and an area spell with no area roll (no caster token), wait for the GM
  if (
    !reflected &&
    (isSpiritCombatGate(resistedBy) || resistedBy === SpellResistedByEnum.ResistanceRollArea)
  ) {
    return false;
  }
  if (entry.requestMessageId) {
    return false;
  }
  // No card (e.g. a module cancelled it) leaves the entry for the GM to rule on
  entry.requestMessageId = await env.requestResistance(entry);
  return !!entry.requestMessageId;
}
