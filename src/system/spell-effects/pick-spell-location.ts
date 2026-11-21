import { localize } from "../util";
import { drawReach, spellReach } from "./place-spell-area";
import { casterTokenOnScene } from "./spell-area-targets";
import { nearestFreeCell, summonerToken, tokenCell } from "./token-cells";
import { metersToPixels } from "./scene-distance";
import type { SpellApplyScope } from "./apply-spell-effect";
import type { SpellLight } from "./spell-behavior";
import type { RqgActor } from "@actors/rqg-actor.ts";

type Point = { x: number; y: number };

/** A picked place; `rotation` in degrees, 0 facing down as for an ambient light, when rotatable. */
export type PickedLocation = Point & { rotation?: number };

const rotationStep = 12;

/**
 * The options of `spellEffects.pickLocation`.
 *
 * @public since 6.2.0
 */
export type PickLocationOptions = {
  /** Within this many meters of the caster; anywhere when left out. */
  rangeMeters?: number | undefined;
  /** The point must be in the caster's sight (RBM p.6). */
  requireSight?: boolean | undefined;
  /** The mouse wheel turns the place, e.g. to aim a cone of light; the result then has `rotation`. */
  rotatable?: boolean | undefined;
  /** A light to show how far it reaches around the point, in its own color, and as its cone turns. */
  previewLight?: SpellLight | undefined;
};

/** What `clickPoint` draws around the point: the reach in pixels, the cone's angle and its color. */
type ReachPreview = { radius: number; angle: number; color: number };

function reachPreviewOf(light: SpellLight | undefined): ReachPreview | undefined {
  const grid = canvas?.scene?.grid;
  if (!light || !grid) {
    return undefined;
  }
  const color = foundry.utils.Color.from(light.color ?? "#ffffff").valueOf();
  return {
    radius: metersToPixels(light.radiusMeters, grid),
    angle: light.angle ?? 360,
    color: Number.isFinite(color) ? color : 0xffffff,
  };
}

/**
 * Let the user click a point on the canvas for a spell, snapped to the center of a grid space, for
 * a spell that takes a place: a destination, or where something appears. Resolves to the canvas
 * point, or undefined when cancelled (right click or Escape) or when the caster has no token on
 * the viewed scene to measure from. With `rotatable` the mouse wheel turns what is placed, and the
 * point has its `rotation`.
 *
 * @public since 6.2.0
 */
export async function pickSpellLocation(
  scope: SpellApplyScope,
  options: PickLocationOptions = {},
): Promise<PickedLocation | undefined> {
  const spellName = scope.spell.name ?? "";
  const caster = await summonerToken(scope);
  const casterObject = caster ? casterTokenOnScene(caster, caster.actor as RqgActor) : undefined;
  if (!casterObject || !canvas?.scene) {
    ui.notifications?.warn(localize("RQG.Dialog.SpellCast.NoCasterTokenOnScene"));
    return undefined;
  }
  const { origin, reach, ranged, sight, inRange, inSight } = spellReach(
    casterObject,
    options.rangeMeters,
    0,
  );
  // Without this the clicks would select and drag the tokens below
  if (!canvas.tokens!.active) {
    canvas.tokens!.activate();
  }
  const ring = ranged ? drawReach(origin, reach, sight) : undefined;
  ui.notifications?.info(
    localize(ranged ? "RQG.SpellLocation.PickInRange" : "RQG.SpellLocation.Pick", {
      spellName: spellName,
    }),
  );
  try {
    return await clickPoint(
      (point) => {
        if (!inRange(point)) {
          ui.notifications?.warn(localize("RQG.SpellLocation.OutOfRange", { spellName }));
          return false;
        }
        if (options.requireSight && !inSight(point)) {
          ui.notifications?.warn(localize("RQG.SpellLocation.OutOfSight", { spellName }));
          return false;
        }
        return true;
      },
      (point) => inRange(point) && (!options.requireSight || inSight(point)),
      !!options.rotatable,
      reachPreviewOf(options.previewLight),
    );
  } finally {
    if (ring && !ring.destroyed) {
      ring.destroy();
    }
  }
}

/** The center of the grid space under the pointer. */
function snappedPointer(): Point {
  const position = canvas!.mousePosition;
  return canvas!.grid!.getCenterPoint({ x: position.x, y: position.y });
}

function clickPoint(
  accept: (point: Point) => boolean,
  isValid: (point: Point) => boolean,
  rotatable = false,
  reach?: ReachPreview,
): Promise<PickedLocation | undefined> {
  const overlay = new PIXI.Graphics();
  overlay.eventMode = "static";
  overlay.cursor = "crosshair";
  overlay.hitArea = canvas!.dimensions!.rect;
  canvas!.controls!.addChild(overlay);
  const marker = new PIXI.Graphics();
  overlay.addChild(marker);
  const size = canvas!.grid!.size;
  let rotation = 0;
  let last: Point = snappedPointer();
  const draw = (point: Point) => {
    last = point;
    const valid = isValid(point);
    const color = valid ? 0x7fb3d5 : 0xcc3333;
    // Rotation 0 faces down, so the facing is the angle from the x axis plus 90 degrees
    const facing = ((rotation + 90) * Math.PI) / 180;
    marker.clear();
    if (reach) {
      const half = (Math.min(reach.angle, 360) * Math.PI) / 360;
      marker.lineStyle(2, valid ? reach.color : color, 0.7).beginFill(reach.color, 0.2);
      if (reach.angle >= 360) {
        marker.drawCircle(point.x, point.y, reach.radius);
      } else {
        marker
          .moveTo(point.x, point.y)
          .arc(point.x, point.y, reach.radius, facing - half, facing + half)
          .closePath();
      }
      marker.endFill();
    }
    marker
      .lineStyle(3, color, 0.9)
      .beginFill(color, 0.25)
      .drawCircle(point.x, point.y, size / 2)
      .endFill();
    if (rotatable && !reach) {
      marker
        .moveTo(point.x, point.y)
        .lineTo(point.x + Math.cos(facing) * size * 1.5, point.y + Math.sin(facing) * size * 1.5);
    }
  };
  // The wheel would zoom the canvas; here it turns what is placed
  const view = canvas!.app!.view as HTMLCanvasElement;
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    rotation = (rotation + (event.deltaY > 0 ? rotationStep : -rotationStep) + 360) % 360;
    draw(last);
  };
  return new Promise((resolve) => {
    let rightDownAt: Point | undefined;
    const finish = (point: PickedLocation | undefined) => {
      document.removeEventListener("keydown", onKey, true);
      view.removeEventListener("wheel", onWheel, true);
      Hooks.off("canvasTearDown", onTearDown);
      if (!overlay.destroyed) {
        overlay.destroy({ children: true });
      }
      resolve(point);
    };
    const onTearDown = () => finish(undefined);
    Hooks.once("canvasTearDown", onTearDown);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(undefined);
      }
    };
    overlay.on("pointermove", () => draw(snappedPointer()));
    overlay.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      if (event.button === 2) {
        rightDownAt = { x: event.global.x, y: event.global.y };
      } else if (event.button === 0) {
        const point = snappedPointer();
        if (accept(point)) {
          finish(rotatable ? { ...point, rotation } : point);
        }
      }
    });
    // A right click cancels; a right drag pans as usual
    overlay.on("rightup", (event: PIXI.FederatedPointerEvent) => {
      const moved = rightDownAt
        ? Math.hypot(event.global.x - rightDownAt.x, event.global.y - rightDownAt.y)
        : Infinity;
      rightDownAt = undefined;
      if (moved < 5) {
        finish(undefined);
      }
    });
    document.addEventListener("keydown", onKey, true);
    if (rotatable) {
      view.addEventListener("wheel", onWheel, { capture: true, passive: false });
    }
    draw(snappedPointer());
  });
}

/**
 * Move a token to the free grid space nearest a canvas point, e.g. the one `pickSpellLocation`
 * gave. Resolves to the token's new position, or undefined when there is no room.
 *
 * @public since 6.2.0
 */
export async function moveTokenNear(
  token: TokenDocument,
  point: Point,
): Promise<Point | undefined> {
  const scene = token.parent;
  if (!scene) {
    return undefined;
  }
  const grid = scene.grid;
  const { i, j } = grid.getOffset(point);
  const cell = nearestFreeCell(
    { col: j, row: i, w: 1, h: 1 },
    { w: token.width, h: token.height },
    scene.tokens.contents
      .filter((other) => other.id !== token.id)
      .map((other) => tokenCell(grid, other)),
  );
  if (!cell) {
    return undefined;
  }
  const position = grid.getTopLeftPoint({ i: cell.row, j: cell.col });
  await token.update(position, { animate: false } as any);
  return position;
}
