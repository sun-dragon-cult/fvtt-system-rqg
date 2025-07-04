// @ts-expect-error regionBehaviors
const { RegionBehaviorType } = foundry.data.regionBehaviors;
// @ts-expect-error data fields not yet defined in types
const { JavaScriptField, BooleanField } = foundry.data.fields;
// @ts-expect-error AsyncFunction
const { AsyncFunction } = foundry.utils;

export class ClickableScriptsRegionBehavior extends RegionBehaviorType {
  static init(): void {
    // @ts-expect-error RegionBehavior
    const regionBehaviorConfig = CONFIG.RegionBehavior;

    regionBehaviorConfig.dataModels.clickableScripts = ClickableScriptsRegionBehavior;
    regionBehaviorConfig.typeIcons.clickableScripts = "fa-solid fa-computer-mouse";
    regionBehaviorConfig.typeLabels.clickableScripts = "TYPES.RegionBehavior.clickableScripts";

    // @ts-expect-error canvas
    const MonkeyPatchedTokenLayer: any = foundry.canvas?.layers?.TokenLayer;

    const originalOnClickLeft = MonkeyPatchedTokenLayer.prototype._onClickLeft;
    MonkeyPatchedTokenLayer.prototype._onClickLeft = function (event: PointerEvent) {
      originalOnClickLeft.call(this, event);
      if (!canvas?.activeLayer || !(canvas.activeLayer instanceof MonkeyPatchedTokenLayer)) {
        return;
      }

      const clickedPoint = canvas.activeLayer.toLocal(event);
      // @ts-expect-error regions
      canvas.scene?.regions?.forEach((region) => {
        if (region.polygonTree.testPoint(clickedPoint)) {
          region.behaviors
            .filter((b: any) => !b.disabled && b.system instanceof ClickableScriptsRegionBehavior)
            .forEach((behavior: any) =>
              ClickableScriptsRegionBehavior._onLeftClick(region, behavior),
            );
        }
      });
    };

    const originalOnClickRight = MonkeyPatchedTokenLayer.prototype._onClickRight;
    MonkeyPatchedTokenLayer.prototype._onClickRight = function (event: PointerEvent) {
      originalOnClickRight.call(this, event);
      if (!canvas?.activeLayer || !(canvas.activeLayer instanceof MonkeyPatchedTokenLayer)) {
        return;
      }

      const clickedPoint = canvas.activeLayer.toLocal(event);
      // @ts-expect-error regions
      canvas.scene?.regions?.forEach((region) => {
        if (region.polygonTree.testPoint(clickedPoint)) {
          region.behaviors
            .filter((b: any) => !b.disabled && b.system instanceof ClickableScriptsRegionBehavior)
            .forEach((behavior: any) =>
              ClickableScriptsRegionBehavior._onRightClick(region, behavior),
            );
        }
      });
    };

    document.body.addEventListener("mousemove", async function (event: MouseEvent) {
      if (!canvas?.activeLayer || !(canvas.activeLayer instanceof MonkeyPatchedTokenLayer)) {
        return;
      }

      // @ts-expect-error events
      const pointer = canvas?.app?.renderer?.events?.pointer;
      if (!pointer) {
        return;
      }
      const currentPoint = canvas.activeLayer.toLocal(event);

      // @ts-expect-error region
      const isPointerInsideRegion: boolean | undefined = canvas.scene?.regions?.contents?.some(
        (region: any) =>
          region.behaviors.some(
            (b: any) =>
              b.system?.showPointerOnHover &&
              !b.disabled &&
              b.system instanceof ClickableScriptsRegionBehavior,
          ) && region.polygonTree.testPoint(currentPoint),
      );

      if (isPointerInsideRegion) {
        document.getElementById("board")!.style.cursor = "var(--cursor-pointer)";
      } else {
        document.getElementById("board")!.style.cursor = "var(--cursor-default)";
      }
    });
  }

  // *** -------------------------------------- ***

  /** @override */
  static defineSchema(): any {
    return {
      showPointerOnHover: new BooleanField({
        gmOnly: true,
        initial: true,
        nullable: false,
        required: true,
        label: "RQG.Region.ClickableScripts.ShowPointerOnHover.Title",
        hint: "RQG.Region.ClickableScripts.ShowPointerOnHover.Hint",
      }),
      leftClickSource: new JavaScriptField({
        async: true,
        gmOnly: true,
        initial: "",
        nullable: false,
        label: "RQG.Region.ClickableScripts.LeftClick.Title",
        hint: "RQG.Region.ClickableScripts.LeftClick.Hint",
      }),
      rightClickSource: new JavaScriptField({
        async: true,
        gmOnly: true,
        initial: "",
        nullable: false,
        label: "RQG.Region.ClickableScripts.RightClick.Title",
      }),
    };
  }

  /** @override */
  static async _onLeftClick(region: any, behavior: any): Promise<void> {
    try {
      const fn = new AsyncFunction(
        "scene",
        "region",
        "behavior",
        `{${behavior.system.leftClickSource}\n}`,
      );

      return await fn.call(globalThis, region.parent, region, behavior);
    } catch (err) {
      console.error(err);
    }
  }

  /** @override */
  static async _onRightClick(region: any, behavior: any): Promise<void> {
    try {
      const fn = new AsyncFunction(
        "scene",
        "region",
        "behavior",
        `{${behavior.system.rightClickSource}\n}`,
      );

      return await fn.call(globalThis, region.parent, region, behavior);
    } catch (err) {
      console.error(err);
    }
  }
}
