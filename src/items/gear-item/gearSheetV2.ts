import {
  type EquippedStatus,
  equippedStatusOptions,
  type PhysicalItemType,
  physicalItemTypeOptions,
} from "@item-model/IPhysicalItem.ts";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface GearSheetContext extends RqgItemSheetContext {
  enrichedDescription: string;
  enrichedGmNotes: string;
  equippedStatusOptions: SelectOptionData<EquippedStatus>[];
  physicalItemTypeOptions: SelectOptionData<PhysicalItemType>[];
}

export class GearSheetV2 extends RqgItemSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "gear"],
    position: { width: 600, height: 500 },
    form: { handler: GearSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.itemGearSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    gear: { template: templatePaths.itemGearSheetV2Gear, scrollable: [""] },
    description: { template: templatePaths.itemGearSheetV2Description, scrollable: [""] },
    gm: { template: templatePaths.itemGearSheetV2Gm, scrollable: [""] },
    effects: { template: templatePaths.itemGearSheetV2Effects, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "gear", label: "RQG.Item.SheetTab.Gear" },
        { id: "description", label: "RQG.Item.SheetTab.Description" },
        { id: "gm", label: "RQG.Item.SheetTab.GMNotes" },
        { id: "effects", label: "RQG.Item.SheetTab.ActiveEffects" },
      ],
      initial: "gear",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<GearSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    const context: GearSheetContext = {
      ...base,
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
      equippedStatusOptions: equippedStatusOptions,
      physicalItemTypeOptions: physicalItemTypeOptions,
    };

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete (context as any).tabs.gm;
      delete (context as any).tabs.effects;
    }

    return context;
  }

  override async _preparePartContext(partId: string, context: any, options: any): Promise<any> {
    context = await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) {
      context.tab = context.tabs[partId];
    }
    return context;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as GearSheetV2;
    const data = formData.object as Record<string, unknown>;
    const isContainerInput = form.elements.namedItem(
      "system.isContainer",
    ) as HTMLInputElement | null;
    data["system.isContainer"] = Boolean(isContainerInput?.checked);
    if (data["system.physicalItemType"] === "unique") {
      data["system.quantity"] = 1;
    }
    await sheet.document.update(data);
  }
}
