import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { SpellConcentrationEnum, SpellDurationEnum, SpellRangeEnum } from "@item-model/spell.ts";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";

interface SpiritMagicSheetContext extends RqgItemSheetContext {
  rangeOptions: SelectOptionData<SpellRangeEnum>[];
  durationOptions: SelectOptionData<SpellDurationEnum>[];
  concentrationOptions: SelectOptionData<SpellConcentrationEnum>[];
}

export class SpiritMagicSheetV2 extends RqgItemSheetV2 {
  override get document(): SpiritMagicItem {
    return super.document as SpiritMagicItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "spiritMagic"],
    position: { width: 600, height: 510 },
    form: { handler: SpiritMagicSheetV2.onSubmit, submitOnChange: false, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.itemSpiritMagicSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    "spirit-magic": { template: templatePaths.itemSpiritMagicSheetV2SpiritMagic, scrollable: [""] },
    effects: { template: templatePaths.itemSpiritMagicSheetV2Effects, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "spirit-magic", label: "RQG.Item.SheetTab.SpiritMagic" },
        { id: "effects", label: "RQG.Item.SheetTab.ActiveEffects" },
      ],
      initial: "spirit-magic",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<SpiritMagicSheetContext> {
    const base = await super._prepareContext();

    const context: SpiritMagicSheetContext = {
      ...base,
      rangeOptions: Object.values(SpellRangeEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.RangeEnum." + (range || "undefined"),
      })),
      durationOptions: Object.values(SpellDurationEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.DurationEnum." + (range || "undefined"),
      })),
      concentrationOptions: Object.values(SpellConcentrationEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.ConcentrationEnum." + (range || "undefined"),
      })),
    };

    if (!context.isGM && this.tabGroups?.["sheet"] === "effects") {
      this.tabGroups["sheet"] = SpiritMagicSheetV2.TABS["sheet"].initial;
    }

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete (context as any).tabs.effects;
    }

    return context;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as SpiritMagicSheetV2;
    const data = formData.object as Record<string, unknown>;

    // Mirror the logic from AppV1 _updateObject
    if (data["system.duration"] === SpellDurationEnum.Temporal) {
      data["system.concentration"] = data["system.concentration"]
        ? data["system.concentration"]
        : SpellConcentrationEnum.Active;
    } else {
      data["system.concentration"] = "";
    }

    if (data["system.duration"] === SpellDurationEnum.Focused) {
      data["system.concentration"] = SpellConcentrationEnum.Active;
    }

    if (data["system.duration"] === SpellDurationEnum.Special) {
      data["system.concentration"] = SpellConcentrationEnum.Passive;
    }

    await sheet.document.update(data);
  }
}
