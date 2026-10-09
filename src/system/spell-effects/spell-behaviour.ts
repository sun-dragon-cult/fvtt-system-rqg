import { Rqid } from "../api/rqid-api";
import { systemId } from "../config";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";
import { callRqgHook } from "../fvtt-type-compat";
import { ERR } from "../error-registry";
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
 * What a spell does beyond attaching an effect template - registered by modules for a spell rqid,
 * or returned by a Macro the spell links as a per-world override. Part of the public API.
 * An override Macro runs on the client that needs the behaviour, so players need LIMITED
 * permission on it, even when the behaviour is `runAsGm`.
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

/** The registered behaviour for a spell rqid, without a world's Macro override. */
export function registeredSpellBehaviour(
  spellRqid: string | undefined,
): SpellBehaviour | undefined {
  const lang = game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return spellRqid
    ? pickRegistration(registrations.get(spellRqid) ?? [], lang, CONFIG.RQG.fallbackLanguage)
        ?.behaviour
    : undefined;
}

function spellRqidOf(spell: RqgItem): string | undefined {
  return spell.flags?.rqg?.documentRqidFlags?.id;
}

/**
 * Run a call into a spell's behaviour - module or world Macro code - so that one failing doesn't
 * stop the spell, or every spell cast at an actor carrying its effects. Undefined when it threw.
 */
export async function guardSpellBehaviour<T>(
  spellName: string,
  call: () => Promise<T> | T,
): Promise<T | undefined> {
  try {
    return await call();
  } catch (error) {
    logger.error(ERR.spellBehaviourFailed, { spellName }, error);
    return undefined;
  }
}

/** A behaviour returned by a Macro the spell links, the GM's per-world override. */
async function macroSpellBehaviour(spell: RqgItem): Promise<SpellBehaviour | undefined> {
  const linkedRqid = resolveSpellEffectRqid(spell as any);
  if (!linkedRqid?.startsWith("m.")) {
    return undefined;
  }
  const macro = await Rqid.fromRqid(linkedRqid, undefined, true);
  if (!(macro instanceof Macro)) {
    return undefined;
  }
  const result = await guardSpellBehaviour(spell.name ?? "", () => macro.execute({ spell } as any));
  return result && typeof result === "object" ? (result as SpellBehaviour) : undefined;
}

/** A spell's behaviour: a Macro it links if there is one, else the one registered for its rqid. */
export async function findSpellBehaviour(spell: RqgItem): Promise<SpellBehaviour | undefined> {
  return (await macroSpellBehaviour(spell)) ?? registeredSpellBehaviour(spellRqidOf(spell));
}

type EffectSpell = { spellUuid?: string; spellRqid?: string };

function effectSpell(effect: ActiveEffect): EffectSpell | undefined {
  return ((effect.system as any)?.spell as EffectSpell | null | undefined) ?? undefined;
}

async function behaviourOfEffectSpell(spell: EffectSpell): Promise<SpellBehaviour | undefined> {
  const spellItem = spell.spellUuid ? await fromUuid(spell.spellUuid) : undefined;
  return spellItem
    ? findSpellBehaviour(spellItem as RqgItem)
    : registeredSpellBehaviour(spell.spellRqid);
}

/** The behaviour of the spell that made an effect, from the spell item if it's still there. */
export async function spellBehaviourForEffect(
  effect: ActiveEffect,
): Promise<SpellBehaviour | undefined> {
  const spell = effectSpell(effect);
  return spell?.spellRqid ? behaviourOfEffectSpell(spell) : undefined;
}

/**
 * The behaviours of several effects' spells, looked up once per spell rqid and in parallel, so
 * effects of the same spell share one behaviour even when a Macro override returns new functions
 * each time it runs.
 */
export async function spellBehavioursForEffects<T extends ActiveEffect>(
  effects: readonly T[],
): Promise<Map<T, SpellBehaviour | undefined>> {
  const bySpellRqid = new Map<string, Promise<SpellBehaviour | undefined>>();
  for (const effect of effects) {
    const spell = effectSpell(effect);
    if (spell?.spellRqid && !bySpellRqid.has(spell.spellRqid)) {
      bySpellRqid.set(spell.spellRqid, behaviourOfEffectSpell(spell));
    }
  }
  return new Map(
    await Promise.all(
      effects.map(async (effect): Promise<[T, SpellBehaviour | undefined]> => {
        const spellRqid = effectSpell(effect)?.spellRqid;
        return [effect, spellRqid ? await bySpellRqid.get(spellRqid) : undefined];
      }),
    ),
  );
}

/** Whether Apply can do something with the spell: attach an effect template or run a behaviour. */
export function hasSpellEffect(spell: RqgItem): boolean {
  return (
    !!resolveSpellEffectRqid(spell as any) || !!registeredSpellBehaviour(spellRqidOf(spell))?.apply
  );
}
