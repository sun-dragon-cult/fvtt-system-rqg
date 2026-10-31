import { getTokenFromActor } from "../util";
import { spellBehaviorOf } from "./spell-behavior";
import { metersToPixels } from "./scene-distance";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { SpellResistedByEnum, SpellTargetKindEnum } from "../../data-model/item-data/spell";

/** How far around the caster an area spell cast at `level` reaches, from its behavior; 0 if none. */
export function spellAreaRadius(spell: RqgItem, level: number): number {
  return spellBehaviorOf(spell)?.areaRadius?.(level) ?? 0;
}

/** Spells cast at one creature or thing, unless their behavior says more (RBM p.8, Core p.258). */
const singleTargetKinds: readonly string[] = [
  SpellTargetKindEnum.Creature,
  SpellTargetKindEnum.Spirit,
  SpellTargetKindEnum.HitLocation,
  SpellTargetKindEnum.Weapon,
  SpellTargetKindEnum.Object,
  SpellTargetKindEnum.SpellOrEffect,
];
const multiTargetResistedBy: readonly string[] = [
  SpellResistedByEnum.ResistanceRollArea,
  SpellResistedByEnum.ResistanceRollPerTarget,
];

/**
 * How many tokens a spell cast at `level` can be cast at: its behavior's count, else one for a
 * spell cast at a creature or thing that isn't resisted per target or across an area, else any.
 */
export function spellMaxTargets(spell: RqgItem, level: number): number {
  const declared = spellBehaviorOf(spell)?.maxTargets?.(level);
  if (declared !== undefined) {
    return declared;
  }
  const { targetKind, resistedBy } = spell.system as { targetKind?: string; resistedBy?: string };
  return singleTargetKinds.includes(targetKind ?? "") &&
    !multiTargetResistedBy.includes(resistedBy ?? "")
    ? 1
    : Infinity;
}

/** The caster's token on the viewed scene, which a spell centered on its caster is measured from. */
export function casterTokenOnScene(
  token: TokenDocument | null | undefined,
  casterActor: RqgActor,
): foundry.canvas.placeables.Token | undefined {
  const casterToken = token ?? (getTokenFromActor(casterActor) as TokenDocument | undefined);
  const caster = casterToken?.object;
  return caster && canvas?.ready && casterToken.parent === canvas.scene ? caster : undefined;
}

/**
 * The tokens a spell centered on its caster reaches at `level`, the caster included: every token
 * this user sees on the viewed scene within its radius. Undefined when the spell has no such area,
 * and empty when the caster has no token there to measure from, which leaves it to the GM.
 */
export function tokensInSpellArea(
  spell: RqgItem,
  level: number,
  token: TokenDocument | null | undefined,
  casterActor: RqgActor,
): foundry.canvas.placeables.Token[] | undefined {
  const meters = spellAreaRadius(spell, level);
  if (meters <= 0) {
    return undefined;
  }
  const caster = casterTokenOnScene(token, casterActor);
  if (!caster || !canvas?.scene) {
    return [];
  }
  const radius = metersToPixels(meters, canvas.scene.grid);
  // Straight-line distance between token centers
  return (canvas.tokens?.placeables ?? []).filter(
    (other) =>
      other.visible &&
      Math.hypot(other.center.x - caster.center.x, other.center.y - caster.center.y) <= radius,
  );
}
