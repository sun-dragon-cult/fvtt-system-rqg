import { localize } from "../util";
import { SpellRangeEnum } from "../../data-model/item-data/spell";
import { drawReach, spellReach } from "./place-spell-area";
import { spellRangeInMeters } from "./spell-area";
import type { SpellApplyScope } from "./apply-spell-effect";

type Point = { x: number; y: number };

/**
 * Let the user place a token of the actor with Foundry's own token placement - grid snapping, the
 * token's real shape and size, gridless scenes - within range and in sight of the caster (RBM p.6).
 * Nothing is created here, since players may not create tokens. Resolves to the top left corner
 * of the place, or undefined when cancelled (right click or Escape).
 */
export async function placeSummonedToken(
  scope: SpellApplyScope,
  casterObject: foundry.canvas.placeables.Token,
  actor: Actor,
  size: { w: number; h: number },
): Promise<Point | undefined> {
  const spellName = scope.spell.name ?? "";
  const rangeMeters =
    (scope.spell.system as any).castingRange === SpellRangeEnum.Ranged
      ? spellRangeInMeters(scope.spell)
      : undefined;
  const { origin, reach, ranged, sight, inRange, inSight } = spellReach(
    casterObject,
    rangeMeters,
    0,
  );
  const tokenData = await actor.getTokenDocument(
    {
      width: size.w,
      height: size.h,
      actorLink: false,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    },
    { parent: canvas!.scene! },
  );
  // Foundry lets only the owner of a token's actor place it, so the preview stands in the caster's
  // actor, and no token is created from it
  const preview = tokenData.toObject();
  preview.actorId = casterObject.document.actorId;
  delete (preview as { delta?: unknown }).delta;
  const ring = ranged ? drawReach(origin, reach, sight) : undefined;
  ui.notifications?.info(
    localize(ranged ? "RQG.SpellLocation.PickInRange" : "RQG.SpellLocation.Pick", { spellName }),
  );
  try {
    const [placed] = await (canvas!.tokens as any).placeTokens([preview], {
      create: false,
      allowRotation: false,
      // The preview's actor is the caster's, so it would show the caster's effect icons and bars
      onMove: ({ preview }: { preview: foundry.canvas.placeables.Token }) => {
        if (preview.effects) {
          preview.effects.renderable = false;
        }
        if (preview.bars) {
          preview.bars.renderable = false;
        }
      },
      preConfirm: ({ document }: { document: TokenDocument }) => {
        const center = document.getCenterPoint();
        if (!inRange(center)) {
          ui.notifications?.warn(localize("RQG.SpellLocation.OutOfRange", { spellName }));
          return false;
        }
        if (!inSight(center)) {
          ui.notifications?.warn(localize("RQG.SpellLocation.OutOfSight", { spellName }));
          return false;
        }
        return true;
      },
    });
    return placed ? { x: placed.x, y: placed.y } : undefined;
  } finally {
    if (ring && !ring.destroyed) {
      ring.destroy();
    }
  }
}
