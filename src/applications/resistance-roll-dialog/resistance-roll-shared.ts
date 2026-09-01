import { systemId } from "../../system/config";
import { MANUAL_SOURCE_VALUE } from "./resistance-roll-dialog-data.types.ts";
import {
  getActorLinkDecoration,
  isDocumentSubType,
  localize,
  normalizeOtherModifierDescriptionForRoll,
  toSignedString,
  usersIdsThatOwnActor,
  warnIfMultipleTargets,
} from "../../system/util";
import { getDefaultRollMode } from "../app-parts/roll-mode";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import type { Modifier } from "../../rolls/resistance-roll/resistance-roll.types.ts";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs.ts";
import type { ResistanceRoll } from "../../rolls/resistance-roll/resistance-roll.ts";

export { augmentOptions, meditateOptions } from "../app-parts/augment-meditate-options";

// Side-resolution logic shared by all three resistance dialogs.

export const characteristicNames: (keyof Characteristics)[] = [
  "strength",
  "constitution",
  "size",
  "dexterity",
  "intelligence",
  "power",
  "charisma",
];

/** The characteristic a resistance side starts on before the GM/player picks one. */
export const defaultCharacteristic: keyof Characteristics = "strength";

export function encodeCharacteristics(names: (keyof Characteristics)[]): string {
  return names.join("+");
}

export function decodeCharacteristics(value: string): (keyof Characteristics)[] {
  return value ? (value.split("+") as (keyof Characteristics)[]) : [];
}

// Includes the three characteristic combos the resistance table uses (knockback, grapple-throw);
// anything else goes through Manual value. Memoized - read on every render of every dialog.
let characteristicOptionsCache: SelectOptionData<string>[] | undefined;

export function getCharacteristicOptions(): SelectOptionData<string>[] {
  if (!characteristicOptionsCache) {
    const shortLabel = (name: keyof Characteristics) =>
      localize(`RQG.Actor.Characteristics.${name}`);
    characteristicOptionsCache = [
      ...characteristicNames.map((name) => ({ value: name, label: shortLabel(name) })),
      ...(
        [
          ["strength", "size"],
          ["strength", "dexterity"],
          ["size", "dexterity"],
        ] as [keyof Characteristics, keyof Characteristics][]
      ).map(([a, b]) => ({
        value: encodeCharacteristics([a, b]),
        label: `${shortLabel(a)} + ${shortLabel(b)}`,
      })),
    ];
  }
  return characteristicOptionsCache;
}

/** Targeted / owned token + actor options, shared by both pickers of every resistance dialog. */
export function getBaseTokenOrActorOptions(): SelectOptionData<string>[] {
  warnIfMultipleTargets();

  const targetedTokenOptions: SelectOptionData<string>[] =
    game.user?.targets.size === 1
      ? Array.from(game.user.targets).map((t) => ({
          value: t.document?.uuid ?? "",
          label: (t.document?.name ?? "") + getActorLinkDecoration(t.actor),
          group: localize("RQG.Dialog.Common.TargetedToken"),
        }))
      : [];

  const ownedTokens = game.scenes?.current?.tokens.filter((t) => t.isOwner) ?? [];
  const ownedTokenOptions: SelectOptionData<string>[] = ownedTokens.map((tokenDocument) => ({
    value: tokenDocument?.uuid ?? "",
    label: (tokenDocument?.name ?? "") + getActorLinkDecoration(tokenDocument.actor),
    group: localize("RQG.Dialog.Common.Tokens"),
  }));

  const allowCombatWithoutToken = game.settings?.get(systemId, "allowCombatWithoutToken");
  let ownedActorOptions: SelectOptionData<string>[] = [];
  if (allowCombatWithoutToken) {
    const ownedTokenActorIds = ownedTokens.map((t) => t.actor?.id);
    ownedActorOptions =
      game.actors
        ?.filter((a) => a.isOwner && !ownedTokenActorIds.includes(a.id))
        .map((actor) => ({
          value: actor.uuid ?? "",
          label: (actor.name ?? "") + getActorLinkDecoration(actor),
          group: localize("RQG.Dialog.Common.Actors"),
        })) ?? [];
  }

  return [...targetedTokenOptions, ...ownedTokenOptions, ...ownedActorOptions];
}

/**
 * One side's token/actor options: current target, owned tokens, owned actors, then Manual.
 * `selfUuid`/`selfName`/`selfActor` force an entry that would otherwise be absent (pass "" to skip).
 * `baseOptions` lets a caller share one scan across both sides.
 */
export function getTokenOrActorOptions(
  selfUuid: string,
  selfName: string,
  selfActor: RqgActor | undefined,
  includeManual = true,
  baseOptions: SelectOptionData<string>[] = getBaseTokenOrActorOptions(),
): SelectOptionData<string>[] {
  const options = [...baseOptions];
  const selfIsMissing = !!selfUuid && !options.some((o) => o.value === selfUuid);
  if (selfIsMissing) {
    options.unshift({
      value: selfUuid,
      label: selfName + getActorLinkDecoration(selfActor),
      group: localize("RQG.Dialog.Common.Character"),
    });
  }

  if (includeManual) {
    const manualOption: SelectOptionData<string> = {
      value: MANUAL_SOURCE_VALUE,
      label: localize("RQG.Dialog.ResistanceRoll.SourceManual"),
      group: localize("RQG.Dialog.Common.Other"),
    };
    // Manual sits near the top so it isn't buried under long Tokens/Actors groups.
    options.splice(selfIsMissing ? 1 : 0, 0, manualOption);
  }

  return options;
}

export function resolveActorFromUuid(uuid: string): RqgActor | undefined {
  const doc = fromUuidSync(uuid) as TokenDocument | RqgActor | undefined;
  return (doc instanceof TokenDocument ? doc.actor : doc) as RqgActor | undefined;
}

export function resolveCharacteristicValue(actor: RqgActor, name: keyof Characteristics): number {
  const characteristics = (actor.system as unknown as { characteristics: Characteristics })
    .characteristics;
  return characteristics?.[name]?.value ?? 0;
}

export function resolveCharacteristicLabel(name: keyof Characteristics): string {
  return localize(`RQG.Actor.Characteristics.${name}`);
}

/**
 * A side's value + label, from an actor's characteristic(s) or a manual label/value pair.
 * `manualName` names a manual source for the "opposes X" flavor line.
 */
export function resolveCharacteristicSide(
  tokenOrActorUuid: string,
  characteristicsEncoded: string,
  manualLabel: string,
  manualValue: number,
  fallbackLabel: string,
  manualName?: string,
): { value: number; label: string; actorName?: string } {
  if (tokenOrActorUuid === MANUAL_SOURCE_VALUE) {
    return {
      value: Number(manualValue) || 0,
      label: manualLabel || fallbackLabel,
      actorName: manualName || undefined,
    };
  }

  const sourceActor = tokenOrActorUuid ? resolveActorFromUuid(tokenOrActorUuid) : undefined;
  const names = decodeCharacteristics(characteristicsEncoded);
  if (!sourceActor || names.length === 0) {
    return { value: 0, label: "" };
  }

  const value = names.reduce((sum, name) => sum + resolveCharacteristicValue(sourceActor, name), 0);
  const label = names.map((name) => resolveCharacteristicLabel(name)).join(" + ");
  return { value, label, actorName: sourceActor.name ?? undefined };
}

/** Keep only player-owned actors - for the request dialog's active picker (a GM owns every token). */
export function filterToPlayerOwnedOptions(
  options: SelectOptionData<string>[],
): SelectOptionData<string>[] {
  return options.filter((option) => resolveActorFromUuid(option.value)?.hasPlayerOwner);
}

/** The Augment/Meditate/Other modifier list in the shape `ResistanceRoll` expects. */
export function buildResistanceModifiers(
  augmentModifier: unknown,
  meditateModifier: unknown,
  otherModifier: unknown,
  otherModifierDescription: string,
): Modifier[] {
  return [
    { value: Number(augmentModifier), description: localize("RQG.Roll.Common.Augment") },
    { value: Number(meditateModifier), description: localize("RQG.Roll.Common.Meditate") },
    {
      value: Number(otherModifier),
      description: normalizeOtherModifierDescriptionForRoll(otherModifierDescription),
    },
  ];
}

// Only a known POW-vs-POW success under 95% is awarded outright; other POW rolls get the reminder.
export async function creditResistanceRollPowExperience(
  activeActor: RqgActor | undefined,
  activeCharacteristicsEncoded: string,
  passiveCharacteristicsEncoded: string | undefined,
  roll: ResistanceRoll,
): Promise<void> {
  if (
    !activeActor ||
    !isDocumentSubType<CharacterActor>(activeActor, ActorTypeEnum.Character) ||
    roll.successLevel == null ||
    !decodeCharacteristics(activeCharacteristicsEncoded).includes("power")
  ) {
    return;
  }

  const powVsPow = decodeCharacteristics(passiveCharacteristicsEncoded ?? "").includes("power");
  if (powVsPow) {
    if (roll.successLevel <= AbilitySuccessLevelEnum.Success && roll.targetChance < 95) {
      await activeActor.awardPowExperience();
    }
    return;
  }

  await activeActor.checkExperience("power", roll.successLevel, roll.targetChance);
}

type ResolvedSide = { value: number; label: string };

/**
 * `<br>`-joined breakdown for a resistance dialog's target% box tooltip, e.g.
 * "STR 13 vs POT 5: 90% / +20% Augment / = 110%".
 */
export function buildResistanceChanceBreakdown(
  active: ResolvedSide,
  passive: ResolvedSide,
  modifiers: Modifier[],
): string {
  const esc = (value: unknown): string => foundry.utils.escapeHTML(String(value ?? ""));
  const side = (s: ResolvedSide): string => (s.label ? `${esc(s.label)} ${s.value}` : `${s.value}`);
  const baseChance = computeResistanceTargetChance(active.value, passive.value);
  const totalChance = computeResistanceTargetChance(
    active.value,
    passive.value,
    modifiers.map((m) => Number(m.value)),
  );
  const vs = esc(localize("RQG.Roll.ResistanceRoll.Vs"));
  return [
    `<strong>${esc(localize("RQG.Dialog.Common.TargetChance"))}</strong>`,
    `${side(active)} ${vs} ${side(passive)}: ${baseChance}%`,
    ...modifiers
      .filter((m) => Number.isFinite(Number(m.value)) && Number(m.value) !== 0)
      .map((m) => `${toSignedString(Number(m.value))}% ${esc(m.description)}`),
    `= ${totalChance}%`,
  ].join("<br>");
}

// "self"/"ic" make no sense when a GM asks a player to roll and needs to see the result.
export const RESISTANCE_REQUEST_ROLL_MODES: readonly string[] = ["public", "gm", "blind"];

/** A resistance dialog's starting roll mode: the stored one if it's still offered, else the client default, else public. */
export function initialResistanceRollMode(stored: string | undefined): foundry.dice.Roll.Mode {
  if (stored && RESISTANCE_REQUEST_ROLL_MODES.includes(stored)) {
    return stored as foundry.dice.Roll.Mode;
  }
  const clientDefault = getDefaultRollMode();
  return (
    RESISTANCE_REQUEST_ROLL_MODES.includes(clientDefault) ? clientDefault : "public"
  ) as foundry.dice.Roll.Mode;
}

/**
 * Chat visibility for a resistance request/response. The target's owners always see the card
 * (they roll it); "gm" also whispers the GMs, "blind" hides the outcome until a GM reveals it.
 */
export function resolveResistanceRequestVisibility(
  mode: string,
  targetActor: RqgActor | undefined,
): { whisper: string[]; blind: boolean } {
  if (mode !== "gm" && mode !== "blind") {
    return { whisper: [], blind: false };
  }
  const gmIds = (game.users?.filter((u) => u.isGM) ?? [])
    .map((u) => u.id)
    .filter((id): id is string => !!id);
  const whisper = [...new Set([...gmIds, ...usersIdsThatOwnActor(targetActor ?? null)])];
  return { whisper, blind: mode === "blind" };
}
