import type { OccupationItem } from "@item-model/occupation-data-model.ts";
import { StandardOfLivingEnum } from "@item-model/occupation-enums.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { localize } from "../../system/util";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../rqg-item-sheet-v2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import { buildItemName } from "../item-name";

interface OccupationSheetContext extends RqgItemSheetContext {
  standardsOfLivingOptions: SelectOptionData<StandardOfLivingEnum>[];
}

export class OccupationSheetV2 extends RqgItemSheetV2 {
  override get document(): OccupationItem {
    return super.document as OccupationItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "occupation"],
    position: { width: 600, height: 650 },
    form: { handler: OccupationSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS = {
    header: { template: templatePaths.itemOccupationSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    occupation: { template: templatePaths.itemOccupationSheetV2Occupation, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [{ id: "occupation", label: "RQG.Item.SheetTab.Occupation" }],
      initial: "occupation",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<OccupationSheetContext> {
    const base = await super._prepareContext();
    const context: OccupationSheetContext = {
      ...base,
      standardsOfLivingOptions: Object.values(StandardOfLivingEnum).map((standard) => ({
        value: standard,
        label: localize("RQG.Item.Occupation.StandardOfLivingEnum." + standard),
      })),
    };

    context.tabs = this._prepareTabs("sheet");

    return context;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as OccupationSheetV2;
    const data = formData.object as Record<string, unknown>;

    const name = buildItemName(ItemTypeEnum.Occupation, {
      occupation: data["system.occupation"] ?? sheet.document.system.occupation,
      specialization: data["system.specialization"] ?? sheet.document.system.specialization,
    });
    if (name) {
      data["name"] = name;
    }

    await sheet.document.update(data);
  }
}
