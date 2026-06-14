import { ItemTypeEnum } from "@item-model/item-types.ts";
import { getSelectRuneOptions, isDocumentSubType } from "../../system/util";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../rqg-item-sheet-v2";
import { SpellDurationEnum, SpellRangeEnum } from "@item-model/spell.ts";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";

interface RuneMagicSheetContext extends RqgItemSheetContext {
  allRuneOptions: SelectOptionData<string>[];
  rangeOptions: SelectOptionData<SpellRangeEnum>[];
  durationOptions: SelectOptionData<SpellDurationEnum>[];
  actorCultOptions: SelectOptionData<string>[];
}

export class RuneMagicSheetV2 extends RqgItemSheetV2 {
  override get document(): RuneMagicItem {
    return super.document as RuneMagicItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "runeMagic"],
    position: { width: 600, height: 530 },
    window: { resizable: true },
    form: { handler: RuneMagicSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
  };

  static override PARTS = {
    header: { template: templatePaths.itemRuneMagicSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    "rune-magic": { template: templatePaths.itemRuneMagicSheetV2RuneMagic, scrollable: [""] },
    effects: { template: templatePaths.itemRuneMagicSheetV2Effects, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: "rune-magic", label: "RQG.Item.SheetTab.RuneMagic" },
        { id: "effects", label: "RQG.Item.SheetTab.ActiveEffects" },
      ],
      initial: "rune-magic",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<RuneMagicSheetContext> {
    const base = await super._prepareContext();

    const context: RuneMagicSheetContext = {
      ...base,
      rangeOptions: Object.values(SpellRangeEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.RangeEnum." + (range || "undefined"),
      })),
      durationOptions: Object.values(SpellDurationEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.DurationEnum." + (range || "undefined"),
      })),
      actorCultOptions: this.getActorCultOptions(),
      allRuneOptions: getSelectRuneOptions("RQG.Item.RuneMagic.AddRuneMagicRunePlaceholder"),
    };

    if (!context.isGM && this.tabGroups?.["sheet"] === "effects") {
      this.tabGroups["sheet"] = RuneMagicSheetV2.TABS["sheet"].initial;
    }

    context.tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete context.tabs["effects"];
    }

    return context;
  }

  private getActorCultOptions(): SelectOptionData<string>[] {
    const actorItems = this.document.actor?.getEmbeddedCollection("Item")?.contents ?? [];
    const options: SelectOptionData<string>[] = [];
    for (const item of actorItems) {
      if (isDocumentSubType<CultItem>(item as RqgItem, ItemTypeEnum.Cult)) {
        options.push({ value: item.id ?? "", label: item.name ?? "" });
      }
    }
    return options;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as RuneMagicSheetV2;
    await sheet.document.update(formData.object);
  }
}
