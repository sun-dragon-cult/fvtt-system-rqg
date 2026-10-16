import { localize } from "../util";
import { metresToPixels } from "./scene-distance";
import type { SpellAreaShape } from "./spell-area";

type Point = { x: number; y: number };

/**
 * Let the caster click where a Ranged spell's area goes. The whole area must lie within the
 * spell's range of the caster (RBM p.4), so the preview shows where its centre may go. Right
 * click or Escape cancels. Resolves to the centre, or undefined when cancelled.
 */
export function pickAreaCentre(
  caster: TokenDocument,
  rangeMetres: number,
  shape: SpellAreaShape,
  spellName: string,
): Promise<Point | undefined> {
  const casterObject = caster.object;
  if (!canvas?.ready || !casterObject || caster.parent !== canvas.scene) {
    ui.notifications?.warn(localize("RQG.Dialog.SpellCast.NoCasterTokenOnScene"));
    return Promise.resolve(undefined);
  }
  const grid = {
    size: canvas.grid!.size,
    distance: canvas.grid!.distance,
    units: canvas.scene?.grid.units,
  };
  const origin = casterObject.center;
  const extent = metresToPixels(
    shape.kind === "circle" ? shape.radius : (shape.side / 2) * Math.SQRT2,
    grid,
  );
  const reach = Math.max(0, metresToPixels(rangeMetres, grid) - extent);
  const size =
    shape.kind === "circle" ? metresToPixels(shape.radius, grid) : metresToPixels(shape.side, grid);
  const inRange = (point: Point) => Math.hypot(point.x - origin.x, point.y - origin.y) <= reach;

  ui.notifications?.info(localize("RQG.SpellArea.PickCentre", { spellName }));
  const preview = new PIXI.Graphics();
  canvas.controls!.addChild(preview);

  const draw = (point: Point) => {
    const colour = inRange(point) ? 0x7fb3d5 : 0xcc3333;
    preview.clear();
    preview.lineStyle(2, 0xffffff, 0.5).drawCircle(origin.x, origin.y, reach);
    preview.beginFill(colour, 0.25).lineStyle(2, colour, 0.9);
    if (shape.kind === "circle") {
      preview.drawCircle(point.x, point.y, size);
    } else {
      preview.drawRect(point.x - size / 2, point.y - size / 2, size, size);
    }
    preview.endFill();
  };

  return new Promise((resolve) => {
    const stage = canvas!.stage!;
    const pointerPosition = (): Point => {
      const position = canvas!.mousePosition;
      return { x: position.x, y: position.y };
    };
    const finish = (point: Point | undefined) => {
      stage.off("pointermove", onMove);
      stage.off("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
      preview.destroy();
      resolve(point);
    };
    const onMove = () => draw(pointerPosition());
    const onDown = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      if (event.button === 2) {
        finish(undefined);
        return;
      }
      const point = pointerPosition();
      if (!inRange(point)) {
        ui.notifications?.warn(localize("RQG.SpellArea.OutOfRange", { spellName }));
        return;
      }
      finish(point);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(undefined);
      }
    };
    stage.on("pointermove", onMove);
    stage.on("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    draw(origin);
  });
}
