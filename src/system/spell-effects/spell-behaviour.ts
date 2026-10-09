import { systemId } from "../config";
import { localize } from "../util";
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

const registry: SpellBehaviourRegistry = {
  register(spellRqid, behaviour, source) {
    const list = registrations.get(spellRqid) ?? [];
    list.push({ ...source, behaviour });
    registrations.set(spellRqid, list);
  },
};

/** Lets modules register their spell behaviours once every module has had its init. */
export function initSpellBehaviours(): void {
  Hooks.once("setup", () => {
    callRqgHook("rqg.registerSpellBehaviours", registry);
  });
}

/** The behaviour registered for a spell rqid. */
export function spellBehaviour(spellRqid: string | undefined): SpellBehaviour | undefined {
  const lang = game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return spellRqid
    ? pickRegistration(registrations.get(spellRqid) ?? [], lang, CONFIG.RQG.fallbackLanguage)
        ?.behaviour
    : undefined;
}

export function spellBehaviourOf(spell: RqgItem): SpellBehaviour | undefined {
  return spellBehaviour(spell.flags?.rqg?.documentRqidFlags?.id);
}

/** The behaviour of the spell that made an effect. */
export function spellBehaviourForEffect(effect: ActiveEffect): SpellBehaviour | undefined {
  return spellBehaviour((effect.system as any)?.spell?.spellRqid);
}

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

/** Whether Apply can do something with the spell: attach an effect template or run a behaviour. */
export function hasSpellEffect(spell: RqgItem): boolean {
  return !!resolveSpellEffectRqid(spell as any) || !!spellBehaviourOf(spell)?.apply;
}
