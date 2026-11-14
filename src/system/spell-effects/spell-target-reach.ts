import { localize } from "../util";
import { SpellRangeEnum } from "../../data-model/item-data/spell";
import { spellReach } from "./place-spell-area";
import { spellRangeInMeters } from "./spell-area";
import { casterTokenOnScene } from "./spell-area-targets";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { SpellTargetReachWarning } from "./spell-target-reach.defs";

type Rect = { x: number; y: number; width: number; height: number };

/** The widest gap between two rectangles along either axis; 0 when they touch or overlap. */
export function rectGap(a: Rect, b: Rect): number {
  const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
  const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
  return Math.max(gapX, gapY);
}

/**
 * Whether a token target is beyond a spell's reach (RBM p.6): a ranged spell reaches what is in
 * range and the caster can perceive, a touch spell needs contact, and a self or special one is not
 * checked. The tests are called only as needed, since sight is costly to compute.
 */
export function spellTargetReachWarning(
  castingRange: string,
  target: {
    isCaster: boolean;
    inRange: () => boolean;
    inSight: () => boolean;
    touching: () => boolean;
  },
): SpellTargetReachWarning {
  if (target.isCaster) {
    return "";
  }
  switch (castingRange) {
    case SpellRangeEnum.Ranged:
      if (!target.inRange()) {
        return "outOfRange";
      }
      return target.inSight() ? "" : "outOfSight";
    case SpellRangeEnum.Touch:
      return target.touching() ? "" : "notTouching";
    default:
      return "";
  }
}

/** The short label for a reach warning, for the target picker and the cast card. */
export function spellTargetReachLabel(warning: SpellTargetReachWarning | undefined): string {
  return warning ? localize(`RQG.Dialog.SpellCast.Reach.${warning}`) : "";
}

/**
 * Checks token targets of a spell against its reach from the caster's token. Undefined when the
 * caster has no token on the viewed scene, so theater of the mind gets no warnings; a target on
 * another scene gets none either. Warnings only: the GM decides.
 */
export function spellTargetReachChecker(
  spell: RqgItem,
  casterToken: TokenDocument | null | undefined,
  casterActor: RqgActor,
): ((target: foundry.canvas.placeables.Token) => SpellTargetReachWarning) | undefined {
  const caster = casterTokenOnScene(casterToken, casterActor);
  if (!caster || !canvas?.scene) {
    return undefined;
  }
  const castingRange = (spell.system as { castingRange?: string }).castingRange ?? "";
  // Made on the first ranged target, and only once: it traces the caster's sight
  let reach: ReturnType<typeof spellReach> | undefined;
  const ranged = () => (reach ??= spellReach(caster, spellRangeInMeters(spell), 0));
  // Within half a grid space counts as contact, so adjacent tokens touch on gridless scenes too
  const touchTolerance = canvas.scene.grid.size / 2;
  return (target) => {
    if (target.document.parent !== caster.document.parent) {
      return "";
    }
    return spellTargetReachWarning(castingRange, {
      isCaster: target === caster || target.actor === caster.actor,
      inRange: () => ranged().inRange(target.center),
      inSight: () => ranged().inSight(target.center),
      touching: () => rectGap(caster.bounds, target.bounds) <= touchTolerance,
    });
  };
}
