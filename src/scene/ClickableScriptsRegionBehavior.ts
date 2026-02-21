import { RqgTokenLayer } from "./RqgTokenLayer";

const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { JavaScriptField, BooleanField } = foundry.data.fields;

const defineClickableScriptsRegionBehaviorSchema = () => ({
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
    initial:
      "// Open a thing with rqid\n" +
      '// game.system.api.rqid.renderRqidDocument("je..axis-mundi", "en");\n\n' +
      "// Open anything\n" +
      '// fromUuidSync("Actor.BKBAy0w4MgvgYeKZ").sheet.render(true);\n\n' +
      "// Open things in compendiums\n" +
      '// (await fromUuid("Compendium.wiki-en-rqg.cults.Item.61zfpHEpM9RtE6XS")).sheet.render(true);\n\n' +
      "// Run a macro (UUID, or rqid)\n" +
      '// fromUuidSync("Macro.ufYFMHFOpuncTeiq").execute();',
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
});

type ClickableScriptsRegionBehaviorSchema = ReturnType<
  typeof defineClickableScriptsRegionBehaviorSchema
>;

export class ClickableScriptsRegionBehavior extends RegionBehaviorType<ClickableScriptsRegionBehaviorSchema> {
  static init(): void {
    const regionBehaviorConfig = CONFIG.RegionBehavior;

    regionBehaviorConfig.dataModels["clickableScripts"] = ClickableScriptsRegionBehavior;
    regionBehaviorConfig.typeIcons["clickableScripts"] = "fa-solid fa-computer-mouse";
    (regionBehaviorConfig.typeLabels as any)["clickableScripts"] =
      "TYPES.RegionBehavior.clickableScripts";

    document.body.addEventListener("mousemove", async function (event: MouseEvent) {
      if (!canvas?.activeLayer || !(canvas.activeLayer instanceof RqgTokenLayer)) {
        return;
      }

      const pointer = canvas?.app?.renderer?.events?.pointer;
      if (!pointer) {
        return;
      }
      const currentPoint = canvas.activeLayer.toLocal(event);

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

  static override defineSchema(): any {
    return defineClickableScriptsRegionBehaviorSchema();
  }
}
