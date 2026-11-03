import { localize } from "../util";
import { drawReach, spellReach } from "./place-spell-area";
import { casterTokenOnScene } from "./spell-area-targets";
import { nearestFreeCell, summonerToken, tokenCell } from "./token-cells";
import type { SpellApplyScope } from "./apply-spell-effect";
import type { RqgActor } from "@actors/rqg-actor.ts";

type Point = { x: number; y: number };

export type PickLocationOptions = {
  /** Within this many meters of the caster; anywhere when left out. */
  rangeMeters?: number | undefined;
  /** The point must be in the caster's sight (RBM p.6). */
  requireSight?: boolean | undefined;
};

/**
 * Let the user click a point on the canvas for a spell, snapped to the center of a grid space, for
 * a spell that takes a place: a destination, or where something appears. Resolves to the canvas
 * point, or undefined when cancelled (right click or Escape) or when the caster has no token on
 * the viewed scene to measure from. Part of the public API.
 */
export async function pickSpellLocation(
  scope: SpellApplyScope,
  options: PickLocationOptions = {},
): Promise<Point | undefined> {
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
): Promise<Point | undefined> {
  const overlay = new PIXI.Graphics();
  overlay.eventMode = "static";
  overlay.cursor = "crosshair";
  overlay.hitArea = canvas!.dimensions!.rect;
  canvas!.controls!.addChild(overlay);
  const marker = new PIXI.Graphics();
  overlay.addChild(marker);
  const size = canvas!.grid!.size;
  const draw = (point: Point) => {
    const color = isValid(point) ? 0x7fb3d5 : 0xcc3333;
    marker
      .clear()
      .lineStyle(3, color, 0.9)
      .beginFill(color, 0.25)
      .drawCircle(point.x, point.y, size / 2)
      .endFill();
  };
  return new Promise((resolve) => {
    let rightDownAt: Point | undefined;
    const finish = (point: Point | undefined) => {
      document.removeEventListener("keydown", onKey, true);
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
          finish(point);
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
    draw(snappedPointer());
  });
}

/**
 * Move a token to the free grid space nearest a canvas point, e.g. the one `pickSpellLocation`
 * gave. Resolves to the token's new position, or undefined when there is no room. Part of the
 * public API.
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
