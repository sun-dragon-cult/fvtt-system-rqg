import {
  type HitLocationHealthState,
  hitLocationHealthStatusOptions,
  type HitLocationItem,
  HitLocationTypesEnum,
} from "@item-model/hitLocationDataModel.ts";
import { getSelectHitLocationOptions } from "../../system/util";
import {
  RqgItemSheetV2,
  type RqgItemSheetContext,
  type AppV2RenderContext,
  type AppV2RenderOptions,
} from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { showHitLocationHealWoundDialog } from ".";

interface HitLocationSheetContext extends RqgItemSheetContext {
  allHitLocationOptions: SelectOptionData<string>[];
  hitLocationTypeOptions: SelectOptionData<HitLocationTypesEnum>[];
  hitLocationHealthStatusOptions: SelectOptionData<HitLocationHealthState>[];
  rqid: string;
}

export class HitLocationSheetV2 extends RqgItemSheetV2 {
  override get document(): HitLocationItem {
    return super.document as HitLocationItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "hitLocation"],
    position: { width: 600, height: 410 },
    window: { resizable: true },
    form: { handler: HitLocationSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
  };

  static override PARTS = {
    header: { template: templatePaths.itemHitLocationSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    "hit-location": { template: templatePaths.itemHitLocationSheetV2HitLocation, scrollable: [""] },
    definition: { template: templatePaths.itemHitLocationSheetV2Definition, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: "hit-location", label: "RQG.Item.SheetTab.HitLocation" },
        { id: "definition", label: "RQG.Item.SheetTab.HitLocationDefinition" },
      ],
      initial: "hit-location",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<HitLocationSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    // Use the actor-derived values so passive effects show correctly
    system.hitPoints = this.document.system.hitPoints;
    system.armorPoints = this.document.system.armorPoints;

    const context: HitLocationSheetContext = {
      ...base,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      allHitLocationOptions: getSelectHitLocationOptions(),
      hitLocationHealthStatusOptions: hitLocationHealthStatusOptions,
      hitLocationTypeOptions: Object.values(HitLocationTypesEnum).map((type) => ({
        value: type,
        label: "RQG.Item.HitLocationType." + type,
      })),
    };

    if (!context.isEmbedded && this.tabGroups?.["sheet"] === "hit-location") {
      this.tabGroups["sheet"] = "definition";
    }
    if (!context.isGM && this.tabGroups?.["sheet"] === "definition") {
      this.tabGroups["sheet"] = "hit-location";
    }

    context.tabs = this._prepareTabs("sheet");

    if (!context.isEmbedded) {
      delete context.tabs["hit-location"];
    }
    if (!context.isGM) {
      delete context.tabs["definition"];
    }

    return context;
  }

  override async _onRender(
    context: AppV2RenderContext,
    options: AppV2RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);

    // Add event listener for healing wounds
    const healWoundElement = this.element?.querySelector<HTMLElement>("[data-item-heal-wound]");
    const actor = this.document.actor;
    const hitLocationId = this.document.id;

    if (healWoundElement && this.document.isEmbedded && actor && hitLocationId) {
      healWoundElement.addEventListener("click", () => {
        showHitLocationHealWoundDialog(actor, hitLocationId);
      });
    }
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as HitLocationSheetV2;
    await sheet.document.update(formData.object);
  }
}
