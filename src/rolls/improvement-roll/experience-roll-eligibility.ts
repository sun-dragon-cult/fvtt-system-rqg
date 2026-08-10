import { type AbilityItem, abilityItemTypes } from "@item-model/item-types.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import { isDocumentSubType, localize } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../ability-roll/ability-roll.defs";
import {
  type AbilityImprovementData,
  type AbilityType,
  buildAbilityImprovementData,
  buildAbilityImprovementRequest,
} from "./ability-improvement-adapter";
import {
  applyCharacteristicGain,
  buildCharacteristicAdapter,
  buildCharacteristicImprovementRequest,
  type CharacteristicImprovementData,
} from "./characteristic-improvement-adapter";
import { getGateDisplay } from "./improvement-roll-presenter";
import { resolveImprovement } from "./improvement-roll";
import type {
  ImprovementDetailRow,
  ImprovementRequest,
  ImprovementResolution,
  ImprovementResult,
} from "./improvement-roll.types";

/** Every source of an experience-driven improvement the session can list. POW is the only
 * characteristic with an experience path (Core p.418) - the rest improve via training/research only. */
export type ExperienceRollEntryKind = AbilityType | "power";

type ExperienceRollEntryBase = {
  id: string;
  kind: ExperienceRollEntryKind;
  name: string;
  typeLocName: string;
  img: string | null;
  currentValueDisplay: string;
  /** Mirrors the adapter's canExperience - false only when hasExperience is set but the source is
   * otherwise capped (a Rune at 100%, POW at species max, Core p.415/p.418). */
  rollable: boolean;
  disabledReasonText?: string;
};

export type ExperienceRollAbilityEntry = ExperienceRollEntryBase & {
  kind: AbilityType;
  item: AbilityItem;
  improvementData: AbilityImprovementData;
};

export type ExperienceRollCharacteristicEntry = ExperienceRollEntryBase & {
  kind: "power";
  improvementData: CharacteristicImprovementData;
};

export type ExperienceRollEntry = ExperienceRollAbilityEntry | ExperienceRollCharacteristicEntry;

export type ExperienceRollGainKind = "fixed" | "random";

/** Same icon the session's own fixed/random toggle uses (RQG.ExperienceRollSession.GainFixed/
 * GainRandom), so a row's gain chip always shows the method it actually used - the current
 * toggle for a pending row, or whatever was selected at roll time for a resolved one, which can
 * differ if the toggle was flipped mid-session. */
function getGainKindIcon(gainKind: ExperienceRollGainKind): string {
  return gainKind === "fixed" ? "fa-hashtag" : "fa-dice";
}

/**
 * Collects every ability (skill/passion/rune) and POW with a pending experience check, abilities
 * and POW alike, via the #910 adapters - the eligibility rule the header button and session both
 * key off (Core p.415, p.418).
 *
 * An entry with hasExperience set but no longer rollable (a Rune at its 100% cap, POW at species
 * max) is still included, disabled with a reason, rather than silently dropped - otherwise the
 * flag would stay set forever with no visible explanation.
 */
export function getEligibleExperienceRollEntries(actor: CharacterActor): ExperienceRollEntry[] {
  const entries: ExperienceRollEntry[] = [];

  for (const item of actor.items) {
    const entry = buildAbilityEntryIfEligible(item);
    if (entry) {
      entries.push(entry);
    }
  }

  const powerEntry = buildPowerEntryIfEligible(actor);
  if (powerEntry) {
    entries.push(powerEntry);
  }

  return entries;
}

/**
 * Looks up a single entry by id without rebuilding the rest of the list - what rollExperienceRollEntry
 * revalidates against on every roll, so a Roll All batch (or a lone row click) only ever pays for the
 * one entry's adapter build (including POW's dice-formula evaluation) instead of the whole actor's.
 */
export function getEligibleExperienceRollEntry(
  actor: CharacterActor,
  entryId: string,
): ExperienceRollEntry | undefined {
  if (entryId === "power") {
    return buildPowerEntryIfEligible(actor);
  }
  const item = actor.items.get(entryId);
  return item ? buildAbilityEntryIfEligible(item) : undefined;
}

// Typed against isDocumentSubType's own parameter, not RqgItem: the two call sites below pass the
// document type actor.items actually yields (iteration and .get() both produce a structurally
// narrower type than the hand-written RqgItem class), which fails RqgItem's stricter shape.
function buildAbilityEntryIfEligible<T extends Parameters<typeof isDocumentSubType>[0]>(
  item: T,
): ExperienceRollAbilityEntry | undefined {
  if (!isDocumentSubType<AbilityItem>(item, abilityItemTypes)) {
    return undefined;
  }
  const sourceHasExperience = Boolean(
    (item._source.system as { hasExperience?: boolean }).hasExperience,
  );
  if (!sourceHasExperience) {
    return undefined;
  }

  const improvementData = buildAbilityImprovementData(item);
  return {
    id: item.id ?? "",
    kind: improvementData.abilityType,
    name: improvementData.name,
    typeLocName: improvementData.typeLocName,
    img: improvementData.img,
    currentValueDisplay: improvementData.currentValueDisplay,
    rollable: improvementData.canExperience,
    disabledReasonText: improvementData.atRuneCap
      ? localize("RQG.Dialog.improveAbilityDialog.sourceUnavailableRuneCap")
      : undefined,
    item,
    improvementData,
  };
}

function buildPowerEntryIfEligible(
  actor: CharacterActor,
): ExperienceRollCharacteristicEntry | undefined {
  const powerHasExperience = Boolean(actor._source.system.characteristics.power.hasExperience);
  if (!powerHasExperience) {
    return undefined;
  }

  const improvementData = buildCharacteristicAdapter(actor, "power");
  return {
    id: "power",
    kind: "power",
    name: improvementData.name,
    typeLocName: improvementData.typeLocName,
    img: null,
    currentValueDisplay: improvementData.currentValueDisplay,
    rollable: improvementData.canExperience,
    disabledReasonText: improvementData.atSpeciesMax
      ? localize("RQG.Dialog.improveAbilityDialog.sourceUnavailableSpeciesMax", {
          name: improvementData.name,
        })
      : undefined,
    improvementData,
  };
}

/** Builds the normalized request for an entry's experience gain, at whatever fixed/random kind is
 * currently selected - the same #910 adapters the per-item improve dialogs use, so the session
 * never reimplements the ability/POW roll-over/roll-under split itself. */
export function buildExperienceRollRequest(
  entry: ExperienceRollEntry,
  gainKind: ExperienceRollGainKind,
  actorName: string,
  speaker: ChatMessage.SpeakerData,
): ImprovementRequest {
  const gainType = `experience-gain-${gainKind}` as const;
  return entry.kind === "power"
    ? buildCharacteristicImprovementRequest(entry.improvementData, gainType, actorName, speaker)
    : buildAbilityImprovementRequest(entry.improvementData, gainType, actorName, speaker);
}

/** Mirrors improvement-roll-tooltip.hbs's per-chip markup (`<b>{{value}}</b><sub><i>{{label}}</i></sub>`)
 * so the row's target tooltip reads identically to the same breakdown once it shows up in chat -
 * built directly rather than through renderTemplate so this stays a synchronous, pure builder. */
function buildGateBreakdownTooltipHtml(chips: readonly ImprovementDetailRow[]): string {
  return chips.map((chip) => `<b>${chip.value}</b><sub><i>${chip.label}</i></sub>`).join(" ");
}

export type ExperienceRollRowView = {
  id: string;
  kind: ExperienceRollEntryKind;
  name: string;
  typeLocName: string;
  img: string | null;
  currentValueDisplay: string;
  comparatorSymbol: string;
  targetDisplay: number;
  /** How the target was derived (e.g. "(species max − POW) × 5 + cult bonus"), the same
   * breakdown #910's chat card shows in its gate roll's expandable details - rendered here as a
   * hover tooltip on the target instead, since the row has no click-to-expand affordance. */
  targetTooltip: string;
  gainFormula: string;
  /** Icon for the (not yet rolled) gain chip - the session's current fixed/random toggle. */
  gainIcon: string;
  valueSuffix: string;
  rollable: boolean;
  disabledReasonText?: string;
  /** Row state modifier class ("resolved"/"disabled"/""), computed here rather than in the
   * template so the three-way row-state logic lives with the rest of the row-view construction. */
  rowStateClass: string;
  resolved?: {
    /** Whether the value actually went up - not the same as the gate roll succeeding, since a
     * random gain formula (e.g. POW's 1d3-1) can roll 0: the check passed but nothing changed. */
    increased: boolean;
    successLevel: AbilitySuccessLevelEnum;
    outcomeText: string;
    gainDisplay?: string;
    /** Icon for the already-rolled gain chip - whatever the toggle was set to at roll time,
     * which can differ from the session's current toggle if it was flipped since. */
    gainIcon: string;
    valueChangeDisplay?: string;
  };
};

/** Row data for the session template: target and comparator direction always come from the
 * request the adapters built, never hardcoded here - a mixed ability/POW queue must not collapse
 * onto a single "roll under/over X" convention (Core p.415 vs p.418). */
export function buildExperienceRollRowView(
  entry: ExperienceRollEntry,
  gainKind: ExperienceRollGainKind,
  actorName: string,
  speaker: ChatMessage.SpeakerData,
  resolved?: ImprovementResult,
): ExperienceRollRowView {
  const request = buildExperienceRollRequest(entry, gainKind, actorName, speaker);
  const gateDisplay = request.gate ? getGateDisplay(request.gate) : undefined;
  // A passed gate can still roll a 0 gain (POW's 1d3-1, e.g.) - "increased" tracks whether the
  // value actually moved, not just whether the gate roll passed, so the label/color never claims
  // a gain that didn't happen.
  const increased = Boolean(resolved?.succeeded && resolved.gain > 0);

  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    typeLocName: entry.typeLocName,
    img: entry.img,
    currentValueDisplay: entry.currentValueDisplay,
    comparatorSymbol: gateDisplay?.symbol ?? "",
    targetDisplay: gateDisplay?.threshold ?? 0,
    targetTooltip: buildGateBreakdownTooltipHtml(request.gateBreakdownChips),
    gainFormula: request.gain.formula,
    gainIcon: getGainKindIcon(gainKind),
    valueSuffix: request.valueSuffix,
    rollable: entry.rollable,
    disabledReasonText: entry.disabledReasonText,
    rowStateClass: resolved ? "resolved" : entry.rollable ? "" : "disabled",
    resolved: resolved
      ? {
          increased,
          successLevel: increased
            ? AbilitySuccessLevelEnum.Success
            : AbilitySuccessLevelEnum.Failure,
          outcomeText: localize(
            increased
              ? "RQG.Roll.ImprovementRoll.Increased"
              : "RQG.Roll.ImprovementRoll.FailedToIncrease",
          ),
          // Still shown on a passed-but-zero gain roll, so a "+0%" distinguishes "the check
          // passed but the die came up empty" from an outright gate failure (no roll at all).
          gainDisplay: resolved.succeeded ? `${resolved.gain}${request.valueSuffix}` : undefined,
          gainIcon: getGainKindIcon(resolved.request.gain.kind),
          valueChangeDisplay: increased
            ? localize("RQG.Roll.ImprovementRoll.ValueChange", {
                from: `${resolved.previousValue}${request.valueSuffix}`,
                to: `${resolved.newValue}${request.valueSuffix}`,
              })
            : undefined,
        }
      : undefined,
  };
}

export type ExperienceRollRowGroup = {
  kind: ExperienceRollEntryKind;
  label: string;
  rows: ExperienceRollRowView[];
};

/** Groups rows by item type, POW in its own group (Core p.418's target/gain read differently from
 * every ability row) - keeps a mixed queue readable rather than one flat list. POW leads (and
 * runes/passions ahead of skills) since a POW gain can shift the skill category modifiers rolled
 * further down the list - see rollAllExperienceRollEntries. */
export function groupExperienceRollRows(rows: ExperienceRollRowView[]): ExperienceRollRowGroup[] {
  const order: ExperienceRollEntryKind[] = ["power", "rune", "passion", "skill"];
  return order
    .map((kind) => ({
      kind,
      label: rows.find((row) => row.kind === kind)?.typeLocName ?? "",
      rows: rows.filter((row) => row.kind === kind),
    }))
    .filter((group) => group.rows.length > 0);
}

/**
 * Applies a resolved gain back to the actor: abilities go through their item's own
 * applyChanceGain (skills store the gain separately in gainedChance), POW goes through the same
 * shared applyCharacteristicGain the per-item improve dialog uses (Core p.418).
 */
async function applyExperienceRollGain(
  actor: CharacterActor,
  entry: ExperienceRollEntry,
  gain: number,
): Promise<void> {
  if (entry.kind === "power") {
    await applyCharacteristicGain(actor, "power", entry.improvementData, gain);
    return;
  }

  await entry.item.system.applyChanceGain(gain);
}

/**
 * Rolls a single entry by id, re-deriving eligibility from live actor data first - the entry
 * handed in by the caller can have gone stale (another route cleared the flag, or pushed a Rune to
 * its cap) while the session was open, mirroring the per-item improve dialogs' submit-time
 * revalidation.
 */
export async function rollExperienceRollEntry(
  actor: CharacterActor,
  entryId: string,
  gainKind: ExperienceRollGainKind,
  actorName: string,
  speaker: ChatMessage.SpeakerData,
): Promise<ImprovementResolution | undefined> {
  const liveEntry = getEligibleExperienceRollEntry(actor, entryId);
  if (!liveEntry || !liveEntry.rollable) {
    return undefined;
  }

  const request = buildExperienceRollRequest(liveEntry, gainKind, actorName, speaker);
  const resolution = await resolveImprovement(request);
  await applyExperienceRollGain(actor, liveEntry, resolution.result.gain);
  return resolution;
}

export type ExperienceRollAllResult = {
  entry: ExperienceRollEntry;
  resolution: ImprovementResolution;
};

/**
 * Rolls every currently-rollable entry, sequentially - each write completes before the next
 * entry's gate roll happens, so there is no race between roll-all's own writes (Core p.415/p.418
 * results never depend on each other, but the actor document does). Pairs each resolution with the
 * entry it came from so a caller can keep that row visible/inert without re-deriving it.
 *
 * POW goes first: it feeds several skill category modifiers (Agility, Communication, Knowledge,
 * Magic, Manipulation, Perception and the weapon skills all read POW's derived modifier - Stealth
 * too, though POW works against it there), recomputed live from source data on every roll. A POW
 * gain that crosses one of those bands only helps abilities rolled after it, so resolving it first
 * gives the rest of this batch the best odds a bulk roll can offer - a player rolling row by row
 * still has full manual control to sequence around this (e.g. rolling Stealth before POW) instead.
 */
export async function rollAllExperienceRollEntries(
  actor: CharacterActor,
  gainKind: ExperienceRollGainKind,
  actorName: string,
  speaker: ChatMessage.SpeakerData,
): Promise<ExperienceRollAllResult[]> {
  const entries = getEligibleExperienceRollEntries(actor);
  const orderedEntries = [
    ...entries.filter((entry) => entry.kind === "power"),
    ...entries.filter((entry) => entry.kind !== "power"),
  ];

  const results: ExperienceRollAllResult[] = [];
  for (const entry of orderedEntries) {
    if (!entry.rollable) {
      continue;
    }
    const resolution = await rollExperienceRollEntry(actor, entry.id, gainKind, actorName, speaker);
    if (resolution) {
      results.push({ entry, resolution });
    }
  }
  return results;
}
