import { RuneTypeEnum, type RuneItem } from "@item-model/runeDataModel.ts";
import { localize, getSelectRuneOptions } from "../../system/util";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface RuneSheetContext extends RqgItemSheetContext {
  opposingRuneOptions: SelectOptionData<string>[];
  minorRuneOptions: SelectOptionData<string>[];
  runeTypeOption: SelectOptionData<RuneTypeEnum>[];
  rqid: string;
}

export class RuneSheetV2 extends RqgItemSheetV2 {
  override get document(): RuneItem {
    return super.document as RuneItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "rune"],
    position: { width: 600, height: 450 },
    form: { handler: RuneSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS = {
    header: { template: templatePaths.itemRuneSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    rune: { template: templatePaths.itemRuneSheetV2Rune, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [{ id: "rune", label: "RQG.Item.SheetTab.Rune" }],
      initial: "rune",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<RuneSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    if (!system.rune) {
      system.rune = this.document.name;
    }

    const context: RuneSheetContext = {
      ...base,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      opposingRuneOptions: getSelectRuneOptions("RQG.Item.Rune.SetOpposingRunePlaceholder"),
      minorRuneOptions: getSelectRuneOptions("RQG.Item.Rune.AddMinorRunePlaceholder"),
      runeTypeOption: Object.values(RuneTypeEnum).map((rt) => ({
        value: rt,
        label: localize(`RQG.Item.Rune.RuneType.${rt}`),
      })),
    };

    context.tabs = this._prepareTabs("sheet");

    return context;
  }

  protected static override async onSubmit(
    event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as RuneSheetV2;
    const data = formData.object as Record<string, unknown>;

    const runeType = data["system.runeType.type"] as string;
    const translatedRuneType = localize(`RQG.Item.Rune.RuneType.${runeType}`);
    data["name"] = `${data["system.rune"]} (${translatedRuneType})`;

    // Only update runeType.name if the runeType.type field changed
    if ((event.target as HTMLSelectElement)?.name === "system.runeType.type") {
      data["system.runeType.name"] = translatedRuneType;
    }
    data["system.chance"] = Number(data["system.chance"]);

    await sheet.document.update(data);
  }
}
