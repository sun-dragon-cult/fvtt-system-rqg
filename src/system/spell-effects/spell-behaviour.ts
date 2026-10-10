import { systemId } from "../config";
import { localize } from "../util";
import { Rqid } from "../api/rqid-api";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";
import { callRqgHook } from "../fvtt-type-compat";
import { RqgLogger } from "../logging/rqg-logger";
import type { RqgItem } from "@items/rqg-item.ts";
import type { SpellEffectApplied, SpellApplyScope } from "./apply-spell-effect";

const logger = new RqgLogger("spell-behaviour");

/**
 * The scope a protective spell's `onIncomingSpell` runs with when another spell is applied to its
 * actor. `effects` are all the target's active effects sharing that hook, so layered defences
 * (Countermagic, then Shield) can be decided together.
 */
export type IncomingSpellScope = SpellApplyScope & { effects: ActiveEffect[] };

/** The scope `onEnd` runs with, on the active GM's client, when a spell effect expires or is deleted. */
export type SpellEndScope = { effect: ActiveEffect };

/**
 * What a spell does beyond attaching an effect template, registered by modules for a spell rqid.
 * Part of the public API.
 */
export type SpellBehaviour = {
  /** Replaces attaching the effect template when Apply is clicked. */
  apply?(scope: SpellApplyScope): Promise<SpellEffectApplied | undefined>;
  /** Runs for a spell's effects when another spell is applied to their actor from outside. */
  onIncomingSpell?(scope: IncomingSpellScope): Promise<{ outcome: "stopped" | "pass" }>;
  /** Runs when one of the spell's effects expires or is deleted. */
  onEnd?(scope: SpellEndScope): Promise<void>;
  /** Run `apply` on the active GM's client, e.g. because it creates tokens, which players may not. */
  runAsGm?: boolean;
};

export type SpellBehaviourSource = { lang: string; priority: number };

/** What modules get from the `rqg.registerSpellBehaviours` hook. */
export type SpellBehaviourRegistry = {
  register(spellRqid: string, behaviour: SpellBehaviour, source: SpellBehaviourSource): void;
};

type Registration = SpellBehaviourSource & { behaviour: SpellBehaviour };

/**
 * The registration to use, chosen the way Rqid chooses documents: the world's language, then the
 * fallback language, then any; of those the highest priority, the first registered on a tie.
 */
export function pickRegistration<T extends SpellBehaviourSource>(
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

/**
 * Run a call into a module's spell behaviour so that one failing doesn't stop the spell, or every
 * spell cast at an actor carrying its effects. Undefined when it threw.
 */
export async function guardSpellBehaviour<T>(
  spellName: string,
  call: () => Promise<T> | T,
): Promise<T | undefined> {
  try {
    return await call();
  } catch (error) {
    logger.error(
      localize("RQG.Notification.Error.SpellBehaviourFailed", { spellName }),
      undefined,
      error,
    );
    return undefined;
  }
}

type HookKind = "apply" | "onIncomingSpell" | "onEnd";

// Per function, so spells registering the same hook (Countermagic and Shield) still share it
const guardedHooks: Record<HookKind, WeakMap<object, (scope: any) => Promise<any>>> = {
  apply: new WeakMap(),
  onIncomingSpell: new WeakMap(),
  onEnd: new WeakMap(),
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
      const result = await guardSpellBehaviour(nameOf(scope), () => hook(scope));
      // Modules are plain JavaScript, so their results aren't type-checked
      return result !== undefined && check(result) ? result : undefined;
    }) as F;
    guardedHooks[kind].set(hook, wrapped);
  }
  return wrapped;
}

function guardBehaviour(behaviour: SpellBehaviour): SpellBehaviour {
  return {
    apply: guarded(
      "apply",
      behaviour.apply,
      (scope) => scope.spell.name ?? "",
      (result) => spellEffectOutcomes.includes(result?.outcome ?? ""),
    ),
    // Names the protective effect whose code it is, not the incoming spell
    onIncomingSpell: guarded(
      "onIncomingSpell",
      behaviour.onIncomingSpell,
      (scope) => scope.effects[0]?.name ?? "",
    ),
    onEnd: guarded("onEnd", behaviour.onEnd, (scope) => scope.effect.name ?? ""),
    runAsGm: behaviour.runAsGm,
  };
}

const registry: SpellBehaviourRegistry = {
  register(spellRqid, behaviour, source) {
    const list = registrations.get(spellRqid) ?? [];
    list.push({ ...source, behaviour: guardBehaviour(behaviour) });
    registrations.set(spellRqid, list);
  },
};

/** Lets modules register their spell behaviours once every module has had its init. */
export function initSpellBehaviours(): void {
  Hooks.once("setup", () => {
    callRqgHook("rqg.registerSpellBehaviours", registry);
  });
}

/** The behaviour registered for a spell rqid; its hooks never throw. */
export function spellBehaviour(
  spellRqid: string | undefined,
  lang?: string,
): SpellBehaviour | undefined {
  const candidates = spellRqid ? registrations.get(spellRqid) : undefined;
  if (!candidates) {
    return undefined;
  }
  const worldLang =
    lang ?? game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return pickRegistration(candidates, worldLang, CONFIG.RQG.fallbackLanguage)?.behaviour;
}

export function spellBehaviourOf(spell: RqgItem): SpellBehaviour | undefined {
  return spellBehaviour(Rqid.getDocumentFlag(spell)?.id);
}

/** The rqid of the spell that made an effect, from its provenance. */
export function spellRqidOfEffect(effect: ActiveEffect): string | undefined {
  return (effect.system as { spell?: { spellRqid?: string } | null } | undefined)?.spell?.spellRqid;
}

/** The behaviour of the spell that made an effect. */
export function spellBehaviourForEffect(effect: ActiveEffect): SpellBehaviour | undefined {
  return spellBehaviour(spellRqidOfEffect(effect));
}

/**
 * Whether Apply can do something with a spell: attach its effect template, or run its
 * behaviour's `apply`, which wins when there are both.
 */
export function canApplySpell(
  spellRqid: string | undefined,
  effectRqidLink: { rqid?: string } | null | undefined,
  lang?: string,
): boolean {
  return (
    !!resolveSpellEffectRqid({ system: { effectRqidLink } }) ||
    !!spellBehaviour(spellRqid, lang)?.apply
  );
}
