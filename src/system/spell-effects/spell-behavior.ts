import { systemId } from "../config";
import { localize } from "../util";
import { Rqid } from "../api/rqid-api";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";
import { callRqgHook } from "../fvtt-type-compat";
import { RqgLogger } from "../logging/rqg-logger";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { AbilityItem } from "@item-model/item-types.ts";
import type { SpellItem } from "@item-model/spell.ts";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import type { AbilityRollOptions } from "../../rolls/ability-roll/ability-roll.types";
import type { CharacteristicRollOptions } from "../../rolls/characteristic-roll/characteristic-roll.types";
import type { SpiritMagicRollOptions } from "../../rolls/spirit-magic-roll/spirit-magic-roll.types";
import type { RuneMagicRollOptions } from "../../rolls/rune-magic-roll/rune-magic-roll.types";
import type { DefenceHookData, PrepareAttackData } from "../../rolls/roll-method-options";
import type { RollPreparation } from "../../rolls/roll-preparation";
import type { SpellEffectApplied, SpellApplyScope } from "./apply-spell-effect";
import type { SpellAcrossScope, SpellAreaScope } from "./spell-area";

const logger = new RqgLogger("spell-behavior");

/**
 * The scope a protective spell's `onIncomingSpell` runs with when another spell is applied to its
 * actor. `effects` are all the target's active effects sharing that hook, so layered defences
 * (Countermagic, then Shield) can be decided together.
 */
export type IncomingSpellScope = SpellApplyScope & { effects: ActiveEffect[] };

/** The scope `onEnd` runs with, on the active GM's client, when a spell effect expires or is deleted. */
export type SpellEndScope = { effect: ActiveEffect };

/**
 * What a roll entry runs with: the prepare hook's arguments, plus `effects`, the rolling actor's
 * active effects whose spells share this entry.
 */
export type SpellRollScope<T> = T & { preparation: RollPreparation; effects: ActiveEffect[] };

/**
 * A roll entry adds modifiers to the hook's options, or sets `preparation.forbidden`. Runs
 * synchronously, whenever a roll dialog changes, so it must not have side effects.
 */
type RollEntry<T> = (scope: SpellRollScope<T>) => void;

/** The entries the system calls from its own prepare hooks, for the rolling actor's spell effects. */
export type SpellRollEntries = {
  onPrepareAbilityRoll?: RollEntry<{ item: AbilityItem; options: AbilityRollOptions }>;
  onPrepareCharacteristicRoll?: RollEntry<{ actor: RqgActor; options: CharacteristicRollOptions }>;
  onPrepareSpellCast?: RollEntry<{
    spell: SpellItem;
    caster: RqgActor;
    options: SpiritMagicRollOptions | RuneMagicRollOptions;
  }>;
  onPrepareAttack?: RollEntry<{ weapon: WeaponItem; attack: PrepareAttackData }>;
  onPrepareDefence?: RollEntry<{ defender: RqgActor; defence: DefenceHookData }>;
};

export type SpellRollEntryName = keyof SpellRollEntries;

export const spellRollEntryNames = [
  "onPrepareAbilityRoll",
  "onPrepareCharacteristicRoll",
  "onPrepareSpellCast",
  "onPrepareAttack",
  "onPrepareDefence",
] as const satisfies readonly SpellRollEntryName[];

/**
 * What a spell does beyond attaching an effect template, registered by modules for a spell rqid.
 * Part of the public API.
 */
export type SpellBehavior = SpellRollEntries & {
  /** Replaces attaching the effect template when Apply is clicked. */
  apply?(scope: SpellApplyScope): Promise<SpellEffectApplied | undefined>;
  /** Runs for a spell's effects when another spell is applied to their actor from outside. */
  onIncomingSpell?(scope: IncomingSpellScope): Promise<{ outcome: "stopped" | "pass" }>;
  /**
   * Runs for a spell's effects when their actor's resistance roll held against a spell, on the
   * client that rolled. "reflected" sends the spell back at its caster (Reflection).
   */
  onResisted?(scope: IncomingSpellScope): Promise<{ outcome: "reflected" | "pass" }>;
  /**
   * Runs on the active GM's client when a token enters the spell's area (`spellEffects.createArea`),
   * or is inside it when it appears (`crossed` false).
   */
  onAreaEnter?(scope: SpellAreaScope): Promise<void>;
  /**
   * Runs on the active GM's client when a token leaves the spell's area, after the system took the
   * area's effects off it.
   */
  onAreaExit?(scope: SpellAreaScope): Promise<void>;
  /** Runs on the active GM's client when a spell is cast across the spell's area from outside. */
  onSpellAcross?(scope: SpellAcrossScope): Promise<void>;
  /** Runs when one of the spell's effects expires or is deleted. */
  onEnd?(scope: SpellEndScope): Promise<void>;
  /** Run `apply` on the active GM's client, e.g. because it creates tokens, which players may not. */
  runAsGm?: boolean;
  /**
   * The radius around the caster, in meters, that an area spell cast at this level reaches. The
   * cast dialog previews it, and the spell is cast at every token in it.
   */
  areaRadius?(level: number): number;
  /** How many tokens the spell cast at this level can be cast at; any number when left out. */
  maxTargets?(level: number): number;
};

const actingHookNames = [
  ...spellRollEntryNames,
  "onIncomingSpell",
  "onResisted",
  "onAreaEnter",
  "onAreaExit",
  "onSpellAcross",
  "onEnd",
] as const satisfies readonly (keyof SpellBehavior)[];

/** Whether a behavior keeps acting while its spell's effects are on, not only when it's cast. */
export function actsWhileActive(behavior: SpellBehavior | undefined): boolean {
  return !!behavior && actingHookNames.some((name) => !!behavior[name]);
}

export type SpellBehaviorSource = { lang: string; priority: number };

/** What modules get from the `rqg.registerSpellBehaviors` hook. */
export type SpellBehaviorRegistry = {
  register(spellRqid: string, behavior: SpellBehavior, source: SpellBehaviorSource): void;
};

type Registration = SpellBehaviorSource & { behavior: SpellBehavior };

/**
 * The registration to use, chosen the way Rqid chooses documents: the world's language, then the
 * fallback language, then any; of those the highest priority, the first registered on a tie.
 */
export function pickRegistration<T extends SpellBehaviorSource>(
  registrations: readonly T[],
  lang: string,
  fallbackLang: string,
): T | undefined {
  const langRank = (r: T) => (r.lang === lang ? 2 : r.lang === fallbackLang ? 1 : 0);
  return registrations.reduce<T | undefined>(
    (best, r) =>
      !best ||
      langRank(r) > langRank(best) ||
      (langRank(r) === langRank(best) && r.priority > best.priority)
        ? r
        : best,
    undefined,
  );
}

const registrations = new Map<string, Registration[]>();

const spellEffectOutcomes: readonly string[] = ["applied", "blocked", "resolved"];

/** Run a call into a module's code, logging `failedMessage` instead of throwing. */
export async function guardModuleCall<T>(
  failedMessage: () => string,
  call: () => Promise<T> | T,
): Promise<T | undefined> {
  try {
    return await call();
  } catch (error) {
    logger.error(failedMessage(), undefined, error);
    return undefined;
  }
}

/**
 * Run a call into a module's spell behavior so that one failing doesn't stop the spell, or every
 * spell cast at an actor carrying its effects. Undefined when it threw.
 */
export async function guardSpellBehavior<T>(
  spellName: string,
  call: () => Promise<T> | T,
): Promise<T | undefined> {
  return guardModuleCall(
    () => localize("RQG.Notification.Error.SpellBehaviorFailed", { spellName }),
    call,
  );
}

type HookKind =
  | "apply"
  | "onIncomingSpell"
  | "onResisted"
  | "onEnd"
  | "onAreaEnter"
  | "onAreaExit"
  | "onSpellAcross";

// Per function, so spells registering the same hook (Countermagic and Shield) still share it
const guardedHooks: Record<HookKind, WeakMap<object, (scope: any) => Promise<any>>> = {
  apply: new WeakMap(),
  onIncomingSpell: new WeakMap(),
  onResisted: new WeakMap(),
  onEnd: new WeakMap(),
  onAreaEnter: new WeakMap(),
  onAreaExit: new WeakMap(),
  onSpellAcross: new WeakMap(),
};

function guarded<F extends (scope: any) => Promise<any>>(
  kind: HookKind,
  hook: F | undefined,
  nameOf: (scope: Parameters<F>[0]) => string,
  check: (result: Awaited<ReturnType<F>>) => boolean = () => true,
): F | undefined {
  if (!hook) {
    return undefined;
  }
  let wrapped = guardedHooks[kind].get(hook) as F | undefined;
  if (!wrapped) {
    wrapped = (async (scope: Parameters<F>[0]) => {
      const result = await guardSpellBehavior(nameOf(scope), () => hook(scope));
      // Modules are plain JavaScript, so their results aren't type-checked
      return result !== undefined && check(result) ? result : undefined;
    }) as F;
    guardedHooks[kind].set(hook, wrapped);
  }
  return wrapped;
}

const guardedRollEntries: Record<SpellRollEntryName, WeakMap<object, RollEntry<any>>> = {
  onPrepareAbilityRoll: new WeakMap(),
  onPrepareCharacteristicRoll: new WeakMap(),
  onPrepareSpellCast: new WeakMap(),
  onPrepareAttack: new WeakMap(),
  onPrepareDefence: new WeakMap(),
};

/** Like `guarded`, but synchronous, since prepare hooks can't wait. */
function guardedRollEntry(
  name: SpellRollEntryName,
  entry: RollEntry<any> | undefined,
): RollEntry<any> | undefined {
  if (!entry) {
    return undefined;
  }
  let wrapped = guardedRollEntries[name].get(entry);
  if (!wrapped) {
    wrapped = (scope) => {
      try {
        entry(scope);
      } catch (error) {
        const spellName = scope.effects[0]?.name ?? "";
        logger.error(
          localize("RQG.Notification.Error.SpellBehaviorFailed", { spellName }),
          undefined,
          error,
        );
      }
    };
    guardedRollEntries[name].set(entry, wrapped);
  }
  return wrapped;
}

/**
 * A number a spell behavior works out from the cast's level. A broken one is ignored: a throw or a
 * non-number gives `fallback` - no area, or no target limit.
 */
function guardedLevelNumber(
  ofLevel: ((level: number) => number) | undefined,
  spellRqid: string,
  fallback: number,
): ((level: number) => number) | undefined {
  if (!ofLevel) {
    return undefined;
  }
  return (level: number) => {
    try {
      const value = Number(ofLevel(level));
      return Number.isNaN(value) ? fallback : value;
    } catch (error) {
      logger.error(
        localize("RQG.Notification.Error.SpellBehaviorFailed", { spellName: spellRqid }),
        undefined,
        error,
      );
      return fallback;
    }
  };
}

function guardedAreaRadius(
  areaRadius: SpellBehavior["areaRadius"],
  spellRqid: string,
): SpellBehavior["areaRadius"] {
  const radius = guardedLevelNumber(areaRadius, spellRqid, 0);
  return (
    radius &&
    ((level) => {
      const meters = radius(level);
      return Number.isFinite(meters) && meters > 0 ? meters : 0;
    })
  );
}

function guardBehavior(behavior: SpellBehavior, spellRqid: string): SpellBehavior {
  const rollEntries = Object.fromEntries(
    spellRollEntryNames.map((name) => [name, guardedRollEntry(name, behavior[name])]),
  ) as SpellRollEntries;
  return {
    ...rollEntries,
    apply: guarded(
      "apply",
      behavior.apply,
      (scope) => scope.spell.name ?? "",
      (result) => spellEffectOutcomes.includes(result?.outcome ?? ""),
    ),
    // Names the protective effect whose code it is, not the incoming spell
    onIncomingSpell: guarded(
      "onIncomingSpell",
      behavior.onIncomingSpell,
      (scope) => scope.effects[0]?.name ?? "",
    ),
    onResisted: guarded("onResisted", behavior.onResisted, (scope) => scope.effects[0]?.name ?? ""),
    onEnd: guarded("onEnd", behavior.onEnd, (scope) => scope.effect.name ?? ""),
    onAreaEnter: guarded("onAreaEnter", behavior.onAreaEnter, (scope) => scope.spell.name ?? ""),
    onAreaExit: guarded("onAreaExit", behavior.onAreaExit, (scope) => scope.spell.name ?? ""),
    onSpellAcross: guarded(
      "onSpellAcross",
      behavior.onSpellAcross,
      (scope) => scope.spell.name ?? "",
    ),
    runAsGm: behavior.runAsGm,
    areaRadius: guardedAreaRadius(behavior.areaRadius, spellRqid),
    maxTargets: guardedLevelNumber(behavior.maxTargets, spellRqid, Infinity),
  };
}

const registry: SpellBehaviorRegistry = {
  register(spellRqid, behavior, source) {
    const list = registrations.get(spellRqid) ?? [];
    list.push({ ...source, behavior: guardBehavior(behavior, spellRqid) });
    registrations.set(spellRqid, list);
  },
};

/** Lets modules register their spell behaviors once every module has had its init. */
export function initSpellBehaviors(): void {
  Hooks.once("setup", () => {
    callRqgHook("rqg.registerSpellBehaviors", registry);
  });
}

/** The behavior registered for a spell rqid; its hooks never throw. */
export function spellBehavior(
  spellRqid: string | undefined,
  lang?: string,
): SpellBehavior | undefined {
  const candidates = spellRqid ? registrations.get(spellRqid) : undefined;
  if (!candidates) {
    return undefined;
  }
  const worldLang =
    lang ?? game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return pickRegistration(candidates, worldLang, CONFIG.RQG.fallbackLanguage)?.behavior;
}

export function spellBehaviorOf(spell: RqgItem): SpellBehavior | undefined {
  return spellBehavior(Rqid.getDocumentFlag(spell)?.id);
}

/** The rqid of the spell that made an effect, from its provenance. */
export function spellRqidOfEffect(effect: ActiveEffect): string | undefined {
  return (effect.system as { spell?: { spellRqid?: string } | null } | undefined)?.spell?.spellRqid;
}

/**
 * The behavior of the spell that made an effect. A spell area's effect on its caster only keeps the
 * area alive, so it has none: the spell acts on the tokens in the area.
 */
export function spellBehaviorForEffect(effect: ActiveEffect): SpellBehavior | undefined {
  return isAreaAnchor(effect) ? undefined : spellBehavior(spellRqidOfEffect(effect));
}

/** A spell area's effect on its caster, which only keeps the area alive (`createArea`). */
export function isAreaAnchor(effect: ActiveEffect): boolean {
  return !!effect.getFlag?.(systemId, "spellArea");
}

/**
 * Whether Apply can do something with a spell: attach its effect template, or run its
 * behavior's `apply`, which wins when there are both.
 */
export function canApplySpell(
  spellRqid: string | undefined,
  effectRqidLink: { rqid?: string } | null | undefined,
  lang?: string,
): boolean {
  return (
    !!resolveSpellEffectRqid({ system: { effectRqidLink } }) ||
    !!spellBehavior(spellRqid, lang)?.apply
  );
}
