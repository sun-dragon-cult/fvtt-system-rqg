import type { OccupationItem } from "@item-model/occupation-data-model.ts";
import { StandardOfLivingEnum } from "@item-model/occupation-enums.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { localize } from "../../system/util";
import {
  RqgItemSheetV2,
  type RqgItemSheetContext,
  type AppV2RenderContext,
  type AppV2RenderOptions,
} from "../rqg-item-sheet-v2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type { RqgLinkFieldElement } from "../../applications/rqg-link/rqg-link-field-element";
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

  override async _onRender(
    context: AppV2RenderContext,
    options: AppV2RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);

    const skills = this.element.querySelector<RqgLinkFieldElement>(
      "rqg-link-field.occupational-skills",
    );
    if (skills) {
      const text = localize("RQG.Item.Occupation.IncomeSkillQ");
      skills.renderEntry = (element, entry, editable) => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset["key"] = "incomeSkill";
        checkbox.checked = Boolean(entry["incomeSkill"]);
        checkbox.disabled = !editable;
        label.append(checkbox, text);
        element.append(label);
      };
    }
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
