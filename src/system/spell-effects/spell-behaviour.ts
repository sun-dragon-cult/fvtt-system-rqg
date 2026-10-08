import { Rqid } from "../api/rqid-api";
import { systemId } from "../config";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";
import type { RqgItem } from "@items/rqg-item.ts";
import type { SpellEffectApplied, SpellApplyScope } from "./apply-spell-effect";

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
    // fvtt-types only knows core hook names
    (Hooks.callAll as (hook: string, ...args: unknown[]) => boolean)(
      "rqg.registerSpellBehaviours",
      registry,
    );
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
  const result = await macro.execute({ spell } as any);
  return result && typeof result === "object" ? (result as SpellBehaviour) : undefined;
}

/** A spell's behaviour: a Macro it links if there is one, else the one registered for its rqid. */
export async function findSpellBehaviour(spell: RqgItem): Promise<SpellBehaviour | undefined> {
  return (await macroSpellBehaviour(spell)) ?? registeredSpellBehaviour(spellRqidOf(spell));
}

/** The behaviour of the spell that made an effect, from the spell item if it's still there. */
export async function spellBehaviourForEffect(
  effect: ActiveEffect,
): Promise<SpellBehaviour | undefined> {
  const spell = (effect.system as any)?.spell as
    { spellUuid?: string; spellRqid?: string } | null | undefined;
  if (!spell?.spellRqid) {
    return undefined;
  }
  const spellItem = spell.spellUuid ? await fromUuid(spell.spellUuid) : undefined;
  return spellItem
    ? findSpellBehaviour(spellItem as RqgItem)
    : registeredSpellBehaviour(spell.spellRqid);
}

/** Whether Apply can do something with the spell: attach an effect template or run a behaviour. */
export function hasSpellEffect(spell: RqgItem): boolean {
  return (
    !!resolveSpellEffectRqid(spell as any) || !!registeredSpellBehaviour(spellRqidOf(spell))?.apply
  );
}
