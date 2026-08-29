import { systemId } from "../../system/config";
import { MANUAL_SOURCE_VALUE } from "./resistance-roll-dialog-data.types.ts";
import {
  getActorLinkDecoration,
  localize,
  normalizeOtherModifierDescriptionForRoll,
  warnIfMultipleTargets,
} from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import type { Modifier } from "../../rolls/resistance-roll/resistance-roll.types.ts";

export { augmentOptions, meditateOptions } from "../app-parts/augment-meditate-options";

// Shared between ResistanceRollDialogV2, ResistanceRequestDialogV2 and
// RespondToResistanceRequestDialogV2 - the token/actor + characteristic(s) picking logic is
// identical no matter which of those dialogs is resolving a side's value.

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

// The Characteristic dropdown also lists the only characteristic combinations the resistance
// table is actually used for in RAW (Knockback: STR+SIZ vs SIZ+DEX; Grapple-throw: STR+DEX vs
// SIZ+DEX) directly, instead of a separate "+ Characteristic" picker, since there are only ever
// these three. Anything else goes through the Manual value entry.
// Memoized (locale/actor-independent, only built once) since it's read on every render of every
// resistance dialog, and each entry needs its label joined from a localize() call.
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

/**
 * The targeted-token/owned-token/owned-actor groups shared by every side of every resistance
 * dialog - built once per render and reused for both the Active and Passive pickers (they only
 * differ in which "self" entry and whether a Manual option gets added on top of this).
 */
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
 * Build one side's token/actor dropdown options, mirroring the attack/defence dialogs'
 * attacker/defender pickers: the current single target (if any) first, then the user's own
 * tokens on the scene, then the user's own actors without a scene token, then a manual entry.
 * `selfUuid`/`selfName`/`selfActor` are an actor/token that should always appear (even if not
 * otherwise owned/on-scene/allowed) so a dialog can default to whoever's sheet it was opened
 * from - pass empty strings to skip this (e.g. the GM's request dialog has no "self").
 * `baseOptions` lets a caller building both the Active and Passive dropdowns in one render pass
 * the shared token/actor scan in once instead of repeating it per side.
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
    // Manual sits right after the self entry rather than at the end: the Tokens/Actors groups
    // can grow long, and Manual shouldn't get buried below them.
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
 * Resolve a side's numeric value + display label, either from an actor/token's characteristic(s)
 * (summed for the two-characteristic combos) or from a manual label/value pair. `manualName`
 * lets a manual entry play the same role an actor-sourced passive's name does (the "opposes X"
 * flavor line) - e.g. naming a disease or obstacle instead of leaving it anonymous.
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

/**
 * Restrict token/actor options to ones with an actual player owner. A GM owns every token, so the
 * unfiltered list would let them pick an NPC/monster as who should roll a resistance *request* -
 * nobody but the GM could ever click that card's Roll button. Only meant for the request dialog's
 * Active picker; every other use of `getTokenOrActorOptions` legitimately wants any owned token.
 */
export function filterToPlayerOwnedOptions(
  options: SelectOptionData<string>[],
): SelectOptionData<string>[] {
  return options.filter((option) => resolveActorFromUuid(option.value)?.hasPlayerOwner);
}

/**
 * Build the Augment/Meditate/Other modifier list from a roll dialog's form fields, in the shape
 * `ResistanceRoll` expects - shared by every dialog that actually performs the roll.
 */
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
