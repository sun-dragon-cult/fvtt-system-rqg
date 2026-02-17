import { ClickableScriptsRegionBehavior } from "./ClickableScriptsRegionBehavior";
import type { AsyncFunction } from "type-fest/source/async-return-type";

const { AsyncFunction } = foundry.utils;
const { TokenLayer } = foundry.canvas.layers;

export class RqgTokenLayer extends TokenLayer {
  static init() {
    CONFIG.Canvas.layers.tokens.layerClass = RqgTokenLayer;
  }

  /** @override */
  override _onClickLeft(event: any): void {
    super._onClickLeft(event);
    RqgTokenLayer.handleBehaviorClick(canvas?.activeLayer?.toLocal(event), "leftClickSource");
  }

  /** @override */
  override _onClickRight(event: any): void {
    super._onClickRight(event);
    RqgTokenLayer.handleBehaviorClick(canvas?.activeLayer?.toLocal(event), "rightClickSource");
  }

  private static handleBehaviorClick(
    clickedPoint: Canvas.Point | undefined,
    sourcePath: string,
  ): void {
    if (!clickedPoint || !canvas?.activeLayer || !(canvas.activeLayer instanceof RqgTokenLayer)) {
      return;
    }

    canvas.scene?.regions?.forEach((region) => {
      if (region.polygonTree.testPoint(clickedPoint)) {
        region.behaviors
          .filter((b: any) => !b.disabled && b.system instanceof ClickableScriptsRegionBehavior)
          .forEach((behavior: any) => {
            try {
              const fn: AsyncFunction = new (AsyncFunction as any)(
                "scene",
                "region",
                "behavior",
                `{${behavior.system[sourcePath]}\n}`,
              );

              // Runs them in parallel, should they be awaited instead?
              return void fn.call(globalThis, region.parent, region, behavior);
            } catch (err) {
              console.error(err);
            }
          });
      }
    });
  }
}
