import { localize } from "../util";
import { metersPerSceneUnit, metersToPixels } from "./scene-distance";
import { areaExtent, type SpellAreaShape } from "./spell-area";

type Point = { x: number; y: number };

/** The Region shape data a placed area becomes. */
export type PlacedAreaShape = Record<string, unknown>;

/**
 * Let the caster place a spell's area on the canvas, snapped to the scene's grid. With a range,
 * the whole area must lie within it of the caster (RBM p.4); without one it goes anywhere, as a
 * ritual is held where its area is. Resolves to the Region shape, or undefined when cancelled.
 */
export async function placeSpellArea(
  caster: TokenDocument,
  shape: SpellAreaShape,
  rangeMeters: number | undefined,
  spellName: string,
): Promise<PlacedAreaShape | undefined> {
  const casterObject = caster.object;
  if (!canvas?.ready || !casterObject || caster.parent !== canvas.scene) {
    ui.notifications?.warn(localize("RQG.Dialog.SpellCast.NoCasterTokenOnScene"));
    return undefined;
  }
  const grid = canvas.scene!.grid;
  const origin = casterObject.center;
  const reach =
    rangeMeters === undefined
      ? Infinity
      : Math.max(0, metersToPixels(rangeMeters, grid) - metersToPixels(areaExtent(shape), grid));
  const inRange = (point: Point) => Math.hypot(point.x - origin.x, point.y - origin.y) <= reach;
  // Core placement would otherwise switch to the Regions layer, where the corner clicks don't land
  if (!canvas.tokens!.active) {
    canvas.tokens!.activate();
  }
  const ring = Number.isFinite(reach) ? drawRangeRing(origin, reach) : undefined;
  try {
    return shape.kind === "polygon"
      ? await pickPolygon(shape.corners, shape.maxArea, inRange, spellName)
      : await placeShape(shape, origin, inRange, spellName, Number.isFinite(reach));
  } finally {
    if (ring && !ring.destroyed) {
      ring.destroy();
    }
  }
}

function drawRangeRing(origin: Point, reach: number): PIXI.Graphics {
  const ring = new PIXI.Graphics()
    .lineStyle(2, 0xffffff, 0.5)
    .drawCircle(origin.x, origin.y, reach);
  canvas!.controls!.addChild(ring);
  return ring;
}

/** A circle or square by Foundry's own Region placement: grid-snapped, the square rotatable. */
async function placeShape(
  shape: Extract<SpellAreaShape, { kind: "circle" | "square" }>,
  origin: Point,
  inRange: (point: Point) => boolean,
  spellName: string,
  ranged: boolean,
): Promise<PlacedAreaShape | undefined> {
  const grid = canvas!.scene!.grid;
  const regionShape =
    shape.kind === "circle"
      ? { type: "circle", ...origin, radius: metersToPixels(shape.radius, grid), gridBased: true }
      : {
          type: "rectangle",
          ...origin,
          width: metersToPixels(shape.side, grid),
          height: metersToPixels(shape.side, grid),
          anchorX: 0.5,
          anchorY: 0.5,
          gridBased: true,
        };
  ui.notifications?.info(
    localize(ranged ? "RQG.SpellArea.PlaceInRange" : "RQG.SpellArea.Place", { spellName }),
  );
  const placed = await canvas!.regions!.placeRegion(
    {
      name: spellName,
      shapes: [regionShape],
      color: game.user?.color?.css ?? "#7fb3d5",
      highlightMode: "coverage",
      displayMeasurements: true,
    } as any,
    {
      create: false,
      allowRotation: shape.kind === "square",
      preConfirm: ({ shape: placedShape }: { shape: { center: Point } }) => {
        if (inRange(placedShape.center)) {
          return true;
        }
        ui.notifications?.warn(localize("RQG.SpellArea.OutOfRange", { spellName }));
        return false;
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
  const metersPerPixel = (grid.distance * metersPerSceneUnit(grid.units)) / grid.size;
  return (Math.abs(twiceArea) / 2) * metersPerPixel ** 2;
}

/** A Region preview that highlights the grid spaces a polygon covers, as the placed area will. */
function coveragePreview(spellName: string): {
  show: (points: Point[]) => void;
  destroy: () => void;
} {
  const RegionDocument = CONFIG.Region.documentClass as any;
  const document = new RegionDocument(
    {
      name: spellName,
      color: game.user?.color?.css ?? "#7fb3d5",
      highlightMode: "coverage",
      shapes: [],
    },
    { parent: canvas!.scene },
  );
  const preview = new (CONFIG.Region.objectClass as any)(document);
  preview._previewType = "creation";
  document._object = preview;
  canvas!.regions!.preview!.addChild(preview);
  void preview.draw();
  return {
    show: (points) => {
      const unique = points.filter(
        (p, i) => !points.slice(0, i).some((q) => q.x === p.x && q.y === p.y),
      );
      document.updateSource({
        shapes:
          unique.length >= 3
            ? [{ type: "polygon", points: unique.flatMap((p) => [p.x, p.y]) }]
            : [],
      });
      document.updateShapeConstraints?.();
      preview.renderFlags.set({ refreshShapes: true });
    },
    destroy: () => {
      if (!preview.destroyed) {
        preview.destroy({ children: true });
      }
    },
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
  const draw = (pointer: Point) => {
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
    overlay.on("pointermove", () => draw(snapped()));
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
