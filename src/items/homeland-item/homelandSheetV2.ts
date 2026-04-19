import { getSelectRuneOptions } from "../../system/util";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { HomelandItem } from "@item-model/homelandDataModel.ts";

interface HomelandSheetContext extends RqgItemSheetContext {
  allRuneOptions: SelectOptionData<string>[];
  enrichedWizardInstructions: string;
}

export class HomelandSheetV2 extends RqgItemSheetV2 {
  override get document(): HomelandItem {
    return super.document as HomelandItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "homeland"],
    position: { width: 600, height: 650 },
    form: { handler: HomelandSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS = {
    header: { template: templatePaths.itemHomelandSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    homeland: { template: templatePaths.itemHomelandSheetV2Homeland, scrollable: [""] },
    wizardInstructions: {
      template: templatePaths.itemHomelandSheetV2WizardInstructions,
      scrollable: [""],
    },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: "homeland", label: "RQG.Item.SheetTab.Homeland" },
        { id: "wizardInstructions", label: "RQG.Item.SheetTab.WizardInstructions" },
      ],
      initial: "homeland",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<HomelandSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    const context: HomelandSheetContext = {
      ...base,
      enrichedWizardInstructions:
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          system.wizardInstructions,
        ),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Homeland.AddHomelandRunePlaceholder"),
    };

    (context as any).tabs = this._prepareTabs("sheet");

    return context;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as HomelandSheetV2;
    const data = formData.object as Record<string, unknown>;

    const region = data["system.region"] ? ` (${data["system.region"]})` : "";
    const newName = String(data["system.homeland"]) + region;
    if (newName) {
      data["name"] = newName;
    }

    await sheet.document.update(data);
  }
}
