import type { RqgActor } from "@actors/rqg-actor.ts";
import type { SpellEffectCast } from "./apply-spell-effect";
import { castPoints } from "./spell-rules";
import { guardSpellBehavior, spellBehaviorForEffect } from "./spell-behavior";
import { localize } from "../util";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("spell-barriers");

/**
 * The priorities of the system's own layers, with gaps so modules can go between them: `area` for
 * spell areas and other Region barriers, `consumable` for layers a spell uses up
 * (`usedUp: "unlessLayerTwoStronger"`, like Countermagic), and `lasting` for layers that stay (like
 * Shield's protection).
 *
 * @public since 6.2.0
 */
export const barrierPriorities = { area: 100, consumable: 200, lasting: 300 } as const;

/**
 * What a protective spell or Region gives to the layers an incoming spell must get through. A lower
 * priority is met first (further out).
 *
 * @public since 6.2.0
 */
type BarrierBase = {
  priority: number;
  /**
   * "unlessLayerTwoStronger": the layer is used up by any spell except one it is 2+ points stronger
   * than. It still stops a spell within 1 point of its strength; a spell 2+ points stronger breaks
   * it and goes on.
   */
  usedUp: "never" | "unlessLayerTwoStronger";
};

/** The barrier of a spell behavior, which judges its effect against the incoming cast. */
export type SpellBarrier = BarrierBase & {
  /** A spell of at most this many points is stopped (see `castPoints`). */
  strength(effect: ActiveEffect, cast: SpellEffectCast): number;
  /** Called instead of deleting the effect when this barrier is used up. */
  onUsedUp?(effect: ActiveEffect): Promise<void>;
};

/** The barrier of a Region behavior, for spells cast from outside the Region. */
export type RegionBarrier = BarrierBase & {
  strength(cast: SpellEffectCast, target: TokenDocument): number;
};

/** The barrier of a spell's area: the area's cast against the incoming one. */
export type SpellAreaBarrier = BarrierBase & {
  strength(areaCast: SpellEffectCast, incomingCast: SpellEffectCast, target: TokenDocument): number;
};

type Layer = BarrierBase & {
  strength: number;
  name: string;
  use?: () => Promise<void>;
};

export type BarrierWalk = {
  /** The layer that stopped the spell, if any. */
  stoppedBy?: Layer;
  /** The used up layers, in the order they were met. */
  usedUp: Layer[];
};

/**
 * Walk the layers from the lowest priority up, each met at the spell's full strength. Layers of
 * equal priority are one: only the strongest counts.
 */
export function walkBarriers(layers: readonly Layer[], points: number): BarrierWalk {
  const byPriority = new Map<number, Layer>();
  for (const layer of layers) {
    const best = byPriority.get(layer.priority);
    if (!best || layer.strength > best.strength) {
      byPriority.set(layer.priority, layer);
    }
  }
  const usedUp: Layer[] = [];
  for (const priority of [...byPriority.keys()].sort((a, b) => a - b)) {
    const layer = byPriority.get(priority)!;
    if (layer.usedUp === "unlessLayerTwoStronger") {
      if (points <= layer.strength - 2) {
        return { stoppedBy: layer, usedUp };
      }
      usedUp.push(layer);
      if (points <= layer.strength + 1) {
        return { stoppedBy: layer, usedUp };
      }
    } else if (points <= layer.strength) {
      return { stoppedBy: layer, usedUp };
    }
  }
  return { usedUp };
}

/** A module's strength, 0 when it throws or isn't a number, so one broken barrier stops nothing. */
function guardedStrength(name: string, strength: () => unknown): number {
  try {
    const value = Number(strength());
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    logger.error(
      localize("RQG.Notification.Error.SpellBehaviorFailed", { spellName: name }),
      undefined,
      error,
    );
    return 0;
  }
}

const usedUpRules: readonly unknown[] = ["never", "unlessLayerTwoStronger"];
const warnedBarriers = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (!warnedBarriers.has(key)) {
    warnedBarriers.add(key);
    logger.warn(message, { notify: false });
  }
}

/**
 * Whether a module's barrier can be used: one without a finite priority is skipped. An unknown
 * `usedUp` is met as "never". Both are reported once per barrier, since a module author would
 * otherwise never learn their barrier doesn't do what they meant.
 */
function isUsableBarrier(barrier: BarrierBase, name: string): boolean {
  if (!usedUpRules.includes(barrier.usedUp)) {
    warnOnce(
      `usedUp|${name}|${String(barrier.usedUp)}`,
      `The barrier of ${name} has an unknown usedUp "${String(barrier.usedUp)}"; it is never used up.`,
    );
  }
  if (typeof barrier.priority !== "number" || !Number.isFinite(barrier.priority)) {
    warnOnce(
      `priority|${name}|${String(barrier.priority)}`,
      `The barrier of ${name} is skipped: its priority ${String(barrier.priority)} isn't a finite number.`,
    );
    return false;
  }
  return true;
}

/** The layers the target's own protective spells give. */
function effectLayers(actor: RqgActor, cast: SpellEffectCast): Layer[] {
  const layers: Layer[] = [];
  for (const effect of actor.allApplicableEffects() as Iterable<
    ActiveEffect & { active: boolean }
  >) {
    const barrier = effect.active ? spellBehaviorForEffect(effect)?.barrier : undefined;
    if (!barrier || !isUsableBarrier(barrier, effect.name ?? "")) {
      continue;
    }
    const strength = guardedStrength(effect.name ?? "", () => barrier.strength(effect, cast));
    if (strength > 0) {
      layers.push({
        priority: barrier.priority,
        strength: strength,
        usedUp: barrier.usedUp,
        name: effect.name ?? "",
        use: async () => {
          if (barrier.onUsedUp) {
            await guardSpellBehavior(effect.name ?? "", () => barrier.onUsedUp!(effect));
          } else {
            await effect.delete();
          }
        },
      });
    }
  }
  return layers;
}

/** A Region behavior's barrier; a module's getter that throws gives none. */
function regionBarrierOf(behavior: RegionBehavior, regionName: string): RegionBarrier | undefined {
  try {
    const barrier = (behavior.system as { barrier?: RegionBarrier } | undefined)?.barrier;
    return barrier && isUsableBarrier(barrier, regionName) ? barrier : undefined;
  } catch (error) {
    logger.error(
      localize("RQG.Notification.Error.SpellBehaviorFailed", { spellName: regionName }),
      undefined,
      error,
    );
    return undefined;
  }
}

/** The layers of the Regions the target is in and the caster isn't. */
function regionLayers(
  target: TokenDocument | undefined,
  caster: TokenDocument | undefined,
  cast: SpellEffectCast,
): Layer[] {
  const layers: Layer[] = [];
  if (!target) {
    return layers;
  }
  for (const region of target.regions ?? []) {
    if (caster?.regions?.has(region)) {
      continue;
    }
    for (const behavior of region.behaviors ?? []) {
      const barrier = behavior.disabled ? undefined : regionBarrierOf(behavior, region.name ?? "");
      if (!barrier) {
        continue;
      }
      const strength = guardedStrength(region.name ?? "", () => barrier.strength(cast, target));
      if (strength > 0) {
        layers.push({
          priority: barrier.priority,
          strength: strength,
          usedUp: barrier.usedUp,
          name: region.name ?? "",
        });
      }
    }
  }
  return layers;
}

/**
 * Meet the incoming spell with the target's barriers: its protective spells' and its Regions'.
 * Removes the used up ones, tells the table what happened, and says whether the spell was stopped.
 * `casterToken` is where the spell comes from; undefined counts as outside every Region.
 */
export async function meetBarriers(
  spellName: string,
  cast: SpellEffectCast,
  targetActor: RqgActor,
  targetToken: TokenDocument | undefined,
  casterToken: TokenDocument | undefined,
): Promise<boolean> {
  const layers = [
    ...effectLayers(targetActor, cast),
    ...regionLayers(targetToken, casterToken, cast),
  ];
  const walk = walkBarriers(layers, castPoints(cast));
  await Promise.all(walk.usedUp.map((layer) => layer.use?.()));
  // A Region's layer has no effect to remove, so nothing was used up
  const usedUp = walk.usedUp.filter((layer) => layer.use);
  const { stoppedBy } = walk;
  if (stoppedBy) {
    const key = usedUp.includes(stoppedBy)
      ? "RQG.Notification.Info.SpellBarrierStoppedUsedUp"
      : "RQG.Notification.Info.SpellBarrierStopped";
    ui.notifications?.info(localize(key, { spellName, barrier: stoppedBy.name }));
  } else if (usedUp.length) {
    ui.notifications?.info(
      localize("RQG.Notification.Info.SpellBarrierBrokeThrough", {
        spellName,
        barrier: usedUp.map((l) => l.name).join(", "),
      }),
    );
  }
  return !!stoppedBy;
}
