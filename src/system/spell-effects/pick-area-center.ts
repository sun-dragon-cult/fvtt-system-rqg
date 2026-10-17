import { localize } from "../util";
import { metersToPixels } from "./scene-distance";
import { areaExtent, type SpellAreaShape } from "./spell-area";

type Point = { x: number; y: number };

/**
 * Let the caster click where a Ranged spell's area goes. The whole area must lie within the
 * spell's range of the caster (RBM p.4), so the preview shows where its center may go. Right
 * click or Escape cancels. Resolves to the center, or undefined when cancelled.
 */
export function pickAreaCenter(
  caster: TokenDocument,
  rangeMeters: number,
  shape: SpellAreaShape,
  spellName: string,
): Promise<Point | undefined> {
  const casterObject = caster.object;
  if (!canvas?.ready || !casterObject || caster.parent !== canvas.scene) {
    ui.notifications?.warn(localize("RQG.Dialog.SpellCast.NoCasterTokenOnScene"));
    return Promise.resolve(undefined);
  }
  const grid = canvas.scene!.grid;
  const origin = casterObject.center;
  const extent = metersToPixels(areaExtent(shape), grid);
  const reach = Math.max(0, metersToPixels(rangeMeters, grid) - extent);
  const size =
    shape.kind === "circle" ? metersToPixels(shape.radius, grid) : metersToPixels(shape.side, grid);
  const inRange = (point: Point) => Math.hypot(point.x - origin.x, point.y - origin.y) <= reach;

  ui.notifications?.info(localize("RQG.SpellArea.PickCenter", { spellName }));
  // Covers the canvas and takes the clicks itself, so they don't select or drag tokens below
  const preview = new PIXI.Graphics();
  preview.eventMode = "static";
  preview.cursor = "crosshair";
  preview.hitArea = canvas.dimensions!.rect;
  canvas.controls!.addChild(preview);

  // The range ring stays put, so it is drawn once; only the area follows the pointer
  const ring = new PIXI.Graphics()
    .lineStyle(2, 0xffffff, 0.5)
    .drawCircle(origin.x, origin.y, reach);
  preview.addChild(ring);
  const area = new PIXI.Graphics();
  preview.addChild(area);
  const draw = (point: Point) => {
    const color = inRange(point) ? 0x7fb3d5 : 0xcc3333;
    area.clear();
    area.beginFill(color, 0.25).lineStyle(2, color, 0.9);
    if (shape.kind === "circle") {
      area.drawCircle(point.x, point.y, size);
    } else {
      area.drawRect(point.x - size / 2, point.y - size / 2, size, size);
    }
    area.endFill();
  };

  return new Promise((resolve) => {
    const pointerPosition = (): Point => {
      const position = canvas!.mousePosition;
      return { x: position.x, y: position.y };
    };
    let rightDownAt: Point | undefined;
    const finish = (point: Point | undefined) => {
      document.removeEventListener("keydown", onKey, true);
      preview.destroy({ children: true });
      resolve(point);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(undefined);
      }
    };
    preview.on("pointermove", () => draw(pointerPosition()));
    preview.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      if (event.button === 2) {
        rightDownAt = { x: event.global.x, y: event.global.y };
        return;
      }
      if (event.button !== 0) {
        return;
      }
      const point = pointerPosition();
      if (!inRange(point)) {
        ui.notifications?.warn(localize("RQG.SpellArea.OutOfRange", { spellName }));
        return;
      }
      finish(point);
    });
    // A right click cancels; a right drag pans the canvas as usual
    preview.on("rightup", (event: PIXI.FederatedPointerEvent) => {
      const moved = rightDownAt
        ? Math.hypot(event.global.x - rightDownAt.x, event.global.y - rightDownAt.y)
        : Infinity;
      rightDownAt = undefined;
      if (moved < 5) {
        finish(undefined);
      }
    });
    document.addEventListener("keydown", onKey, true);
    draw(origin);
  });
}
