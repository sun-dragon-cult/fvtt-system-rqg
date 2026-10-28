import { localize } from "../util";
import { metersPerPixel, metersToPixels } from "./scene-distance";
import { areaExtent, type SpellAreaShape } from "./spell-area";
import { casterTokenOnScene } from "./spell-area-targets";
import type { RqgActor } from "@actors/rqg-actor.ts";

type Point = { x: number; y: number };

/** A spell area's Region color, unless it is visible to everyone. */
export const spellAreaColor = "#7fb3d5";

/** The Region shape data a placed area becomes. */
export type PlacedAreaShape = Record<string, unknown>;

/**
 * Let the caster place a spell's area on the canvas, snapped to the scene's grid. With a range,
 * the whole area must lie within it of the caster (RBM p.4), around a point the caster can see
 * (RBM p.6); a GM moves the Region afterwards for anywhere else. Without one it goes anywhere, as
 * a ritual is held where its area is. Resolves to the Region shape, or undefined when cancelled.
 */
export async function placeSpellArea(
  caster: TokenDocument,
  shape: SpellAreaShape,
  rangeMeters: number | undefined,
  spellName: string,
): Promise<PlacedAreaShape | undefined> {
  const casterObject = casterTokenOnScene(caster, caster.actor as RqgActor);
  if (!casterObject || !canvas?.scene) {
    ui.notifications?.warn(localize("RQG.Dialog.SpellCast.NoCasterTokenOnScene"));
    return undefined;
  }
  const grid = canvas.scene.grid;
  const origin = casterObject.center;
  const reach =
    rangeMeters === undefined
      ? Infinity
      : Math.max(0, metersToPixels(rangeMeters, grid) - metersToPixels(areaExtent(shape), grid));
  const inRange = (point: Point) => Math.hypot(point.x - origin.x, point.y - origin.y) <= reach;
  const ranged = Number.isFinite(reach);
  const sight =
    ranged && reach > 0
      ? CONFIG.Canvas.polygonBackends.sight.create(origin, {
          type: "sight",
          radius: reach,
          source: casterObject.vision ?? undefined,
        } as any)
      : undefined;
  const inSight = (point: Point) => !sight || sight.contains(point.x, point.y);
  // Core placement would otherwise switch to the Regions layer, where the corner clicks don't land
  if (!canvas.tokens!.active) {
    canvas.tokens!.activate();
  }
  const ring = ranged ? drawReach(origin, reach, sight) : undefined;
  try {
    return shape.kind === "polygon"
      ? await pickPolygon(shape.corners, shape.maxArea, inRange, spellName)
      : await placeShape(shape, origin, inRange, inSight, spellName, ranged);
  } finally {
    if (ring && !ring.destroyed) {
      ring.destroy();
    }
  }
}

/** The range ring, with the scene dimmed outside where the area may go: in sight when given. */
function drawReach(origin: Point, reach: number, sight: PIXI.Polygon | undefined): PIXI.Graphics {
  const graphics = new PIXI.Graphics()
    .beginFill(0x000000, 0.4)
    .drawShape(canvas!.dimensions!.rect)
    .beginHole();
  if (sight) {
    graphics.drawShape(sight);
  } else {
    graphics.drawCircle(origin.x, origin.y, reach);
  }
  graphics.endHole().endFill().lineStyle(2, 0xffffff, 0.5).drawCircle(origin.x, origin.y, reach);
  canvas!.controls!.addChild(graphics);
  return graphics;
}

/** A circle or square by Foundry's own Region placement: grid-snapped, the square rotatable. */
async function placeShape(
  shape: Extract<SpellAreaShape, { kind: "circle" | "square" }>,
  origin: Point,
  inRange: (point: Point) => boolean,
  inSight: (point: Point) => boolean,
  spellName: string,
  ranged: boolean,
): Promise<PlacedAreaShape | undefined> {
  const grid = canvas!.scene!.grid;
  const regionShape =
    shape.kind === "circle"
      ? // A true circle: grid-based, it would follow the grid's metric, a hexagon on hex grids
        { type: "circle", ...origin, radius: metersToPixels(shape.radius, grid), gridBased: false }
      : {
          type: "rectangle",
          ...origin,
          width: metersToPixels(shape.side, grid),
          height: metersToPixels(shape.side, grid),
          anchorX: 0.5,
          anchorY: 0.5,
          gridBased: true,
        };
  // Snapped to a grid vertex, an area smaller than a grid space would cover no space at all
  const span =
    shape.kind === "circle"
      ? 2 * metersToPixels(shape.radius, grid)
      : metersToPixels(shape.side, grid);
  const snapToSpaceCenter = span < grid.size;
  ui.notifications?.info(
    localize(ranged ? "RQG.SpellArea.PlaceInRange" : "RQG.SpellArea.Place", { spellName }),
  );
  const placed = await canvas!.regions!.placeRegion(
    {
      name: spellName,
      shapes: [regionShape],
      color: game.user?.color?.css ?? spellAreaColor,
      highlightMode: "coverage",
      displayMeasurements: true,
    } as any,
    {
      create: false,
      allowRotation: shape.kind === "square",
      onMove: ({
        shape: moved,
        position,
        snap,
      }: {
        shape: any;
        position: Point;
        snap: boolean;
      }) => {
        if (!snapToSpaceCenter || !snap) {
          return;
        }
        moved.move(canvas!.grid!.getCenterPoint(position), { snap: false });
        return false;
      },
      preConfirm: ({ shape: placedShape }: { shape: { center: Point } }) => {
        if (!inRange(placedShape.center)) {
          ui.notifications?.warn(localize("RQG.SpellArea.OutOfRange", { spellName }));
          return false;
        }
        if (!inSight(placedShape.center)) {
          ui.notifications?.warn(localize("RQG.SpellArea.OutOfSight", { spellName }));
          return false;
        }
        return true;
      },
    } as any,
  );
  return (placed?.shapes as any)?.[0]?.toObject();
}

/** Square meters inside a polygon of canvas points. */
export function polygonAreaInMeters(
  points: Point[],
  grid: { size: number; distance: number; units?: string },
): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return (Math.abs(twiceArea) / 2) * metersPerPixel(grid) ** 2;
}

/** A Region preview that highlights the grid spaces a shape covers, as the placed area will. */
export function coveragePreview(spellName: string): {
  show: (points: Point[]) => void;
  showShapes: (shapes: PlacedAreaShape[]) => void;
  destroy: () => void;
} {
  let preview: any;
  const destroy = () => {
    if (preview && !preview.destroyed) {
      preview.destroy({ children: true });
    }
    preview = undefined;
  };
  // A Region keeps a control per shape it was drawn with: another shape count needs a new Region
  const showShapes = (shapes: PlacedAreaShape[]) => {
    if (preview && shapes.length && preview.document.shapes.length === shapes.length) {
      preview.document.updateSource({ shapes: shapes });
      preview.document.updateShapeConstraints?.();
      preview.renderFlags.set({ refreshShapes: true });
      return;
    }
    destroy();
    if (!shapes.length) {
      return;
    }
    const RegionDocument = CONFIG.Region.documentClass as any;
    const document = new RegionDocument(
      {
        name: spellName,
        color: game.user?.color?.css ?? spellAreaColor,
        highlightMode: "coverage",
        shapes: shapes,
      },
      { parent: canvas!.scene },
    );
    preview = new (CONFIG.Region.objectClass as any)(document);
    preview._previewType = "creation";
    document._object = preview;
    canvas!.regions!.preview!.addChild(preview);
    void preview.draw();
  };
  return {
    show: (points) => {
      const unique = points.filter(
        (p, i) => !points.slice(0, i).some((q) => q.x === p.x && q.y === p.y),
      );
      showShapes(
        unique.length >= 3 ? [{ type: "polygon", points: unique.flatMap((p) => [p.x, p.y]) }] : [],
      );
    },
    showShapes: showShapes,
    destroy: destroy,
  };
}

/**
 * Click the corners of an area, like a ward's four wands, snapped to the grid. The area may not
 * exceed `maxArea` square meters. Right click takes back the last corner, or cancels with none;
 * Escape cancels.
 */
function pickPolygon(
  corners: number,
  maxArea: number,
  inRange: (point: Point) => boolean,
  spellName: string,
): Promise<PlacedAreaShape | undefined> {
  const grid = canvas!.scene!.grid;
  ui.notifications?.info(
    localize("RQG.SpellArea.PlaceCorners", {
      spellName,
      corners: String(corners),
      maxArea: String(Math.round(maxArea)),
    }),
  );
  // Covers the canvas and takes the clicks itself, so they don't select or drag tokens below
  const overlay = new PIXI.Graphics();
  overlay.eventMode = "static";
  overlay.cursor = "crosshair";
  overlay.hitArea = canvas!.dimensions!.rect;
  canvas!.controls!.addChild(overlay);
  const coverage = coveragePreview(spellName);
  const outline = new PIXI.Graphics();
  overlay.addChild(outline);
  const label = new PIXI.Text("", {
    fill: 0xffffff,
    fontSize: 24,
    stroke: 0x000000,
    strokeThickness: 4,
  });
  overlay.addChild(label);

  const points: Point[] = [];
  const snapped = (): Point => {
    const position = canvas!.mousePosition;
    return canvas!.regions!.getSnappedPoint({ x: position.x, y: position.y });
  };
  let drawnAt: Point | undefined;
  const draw = (pointer: Point) => {
    drawnAt = pointer;
    const shown = [...points, pointer];
    const area = polygonAreaInMeters(shown, grid);
    const fits = area <= maxArea && shown.every(inRange);
    const color = fits ? 0x7fb3d5 : 0xcc3333;
    coverage.show(shown);
    outline.clear().lineStyle(2, color, 0.9);
    outline.drawPolygon(shown.flatMap((p) => [p.x, p.y]));
    for (const p of shown) {
      outline.beginFill(color, 1).drawCircle(p.x, p.y, 5).endFill();
    }
    label.text = `${Math.round(area)} / ${Math.round(maxArea)} m²`;
    label.position.set(pointer.x + 16, pointer.y + 16);
  };

  return new Promise((resolve) => {
    let rightDownAt: Point | undefined;
    const finish = (shape: PlacedAreaShape | undefined) => {
      document.removeEventListener("keydown", onKey, true);
      Hooks.off("canvasTearDown", onTearDown);
      coverage.destroy();
      if (!overlay.destroyed) {
        overlay.destroy({ children: true });
      }
      resolve(shape);
    };
    const onTearDown = () => finish(undefined);
    Hooks.once("canvasTearDown", onTearDown);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(undefined);
      }
    };
    overlay.on("pointermove", () => {
      const pointer = snapped();
      if (pointer.x !== drawnAt?.x || pointer.y !== drawnAt?.y) {
        draw(pointer);
      }
    });
    overlay.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      if (event.button === 2) {
        rightDownAt = { x: event.global.x, y: event.global.y };
        return;
      }
      if (event.button !== 0) {
        return;
      }
      const point = snapped();
      if (!inRange(point)) {
        ui.notifications?.warn(localize("RQG.SpellArea.OutOfRange", { spellName }));
        return;
      }
      const next = [...points, point];
      const area = polygonAreaInMeters(next, grid);
      if (area > maxArea) {
        ui.notifications?.warn(
          localize("RQG.SpellArea.TooLarge", {
            spellName,
            area: String(Math.round(area)),
            maxArea: String(Math.round(maxArea)),
          }),
        );
        return;
      }
      points.push(point);
      if (points.length === corners) {
        finish({ type: "polygon", points: points.flatMap((p) => [p.x, p.y]) });
      } else {
        draw(point);
      }
    });
    // A right click takes back a corner, or cancels with none; a right drag pans as usual
    overlay.on("rightup", (event: PIXI.FederatedPointerEvent) => {
      const moved = rightDownAt
        ? Math.hypot(event.global.x - rightDownAt.x, event.global.y - rightDownAt.y)
        : Infinity;
      rightDownAt = undefined;
      if (moved >= 5) {
        return;
      }
      if (!points.length) {
        finish(undefined);
      } else {
        points.pop();
        draw(snapped());
      }
    });
    document.addEventListener("keydown", onKey, true);
    draw(snapped());
  });
}
