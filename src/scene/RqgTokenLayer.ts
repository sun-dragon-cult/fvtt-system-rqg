import { ClickableScriptsRegionBehavior } from "./ClickableScriptsRegionBehavior";

// @ts-expect-error AsyncFunction
const { AsyncFunction } = foundry.utils;
// @ts-expect-error TokenLayer
const { TokenLayer } = foundry.canvas.layers;

export class RqgTokenLayer extends TokenLayer {
  static init() {
    // @ts-expect-error layerClass
    CONFIG.Canvas.layers.tokens.layerClass = RqgTokenLayer;
  }

  /** @override */
  _onClickLeft(event: any): void {
    super._onClickLeft(event);
    RqgTokenLayer.handleBehaviorClick(canvas?.activeLayer?.toLocal(event), "leftClickSource");
  }

  /** @override */
  _onClickRight(event: any): void {
    super._onClickLeft(event);
    RqgTokenLayer.handleBehaviorClick(canvas?.activeLayer?.toLocal(event), "rightClickSource");
  }

  private static handleBehaviorClick(clickedPoint: Point | undefined, sourcePath: string): void {
    if (!canvas?.activeLayer || !(canvas.activeLayer instanceof RqgTokenLayer)) {
      return;
    }

    // @ts-expect-error regions
    canvas.scene?.regions?.forEach((region) => {
      if (region.polygonTree.testPoint(clickedPoint)) {
        region.behaviors
          .filter((b: any) => !b.disabled && b.system instanceof ClickableScriptsRegionBehavior)
          .forEach((behavior: any) => {
            try {
              const fn = new AsyncFunction(
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
