import {
  armorTypeTranslationKeys,
  materialTranslationKeys,
  type ArmorItem,
} from "@item-model/armorDataModel.ts";
import { type EquippedStatus, equippedStatusOptions } from "@item-model/IPhysicalItem.ts";
import {
  RqgItemSheetV2,
  type RqgItemSheetContext,
  type AppV2RenderContext,
  type AppV2RenderOptions,
} from "../RqgItemSheetV2";
import {
  convertFormValueToString,
  getAvailableHitLocations,
  getSelectHitLocationOptions,
  localize,
} from "../../system/util";
import { systemId } from "../../system/config";
import { RqidLink } from "../../data-model/shared/rqidLink";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface ArmorSheetContext extends RqgItemSheetContext {
  allHitLocationOptions: SelectOptionData<string>[];
  equippedStatusOptions: SelectOptionData<EquippedStatus>[];
  armorTypeNames: string[];
  materialNames: string[];
  enrichedDescription: string;
  enrichedGmNotes: string;
}

export class ArmorSheetV2 extends RqgItemSheetV2 {
  override get document(): ArmorItem {
    return super.document as ArmorItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "armor"],
    position: { width: 600, height: 640 },
    form: {
      handler: ArmorSheetV2.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: { resizable: true },
  };

  static override PARTS = {
    header: { template: templatePaths.itemArmorSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    armor: { template: templatePaths.itemArmorSheetV2Armor, scrollable: [""] },
    description: { template: templatePaths.itemArmorSheetV2Description, scrollable: [""] },
    gm: { template: templatePaths.itemArmorSheetV2Gm, scrollable: [""] },
    effects: { template: templatePaths.itemArmorSheetV2Effects, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: "armor", label: "RQG.Item.SheetTab.Armor" },
        { id: "description", label: "RQG.Item.SheetTab.Description" },
        { id: "gm", label: "RQG.Item.SheetTab.GMNotes" },
        { id: "effects", label: "RQG.Item.SheetTab.ActiveEffects" },
      ],
      initial: "armor",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<ArmorSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    const context: ArmorSheetContext = {
      ...base,
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
      allHitLocationOptions: getSelectHitLocationOptions(
        "RQG.Item.Armor.AddNewCoveredHitLocationPlaceholder",
      ),
      equippedStatusOptions: equippedStatusOptions,
      armorTypeNames: armorTypeTranslationKeys.map((key) => localize(key)),
      materialNames: materialTranslationKeys.map((key) => localize(key)),
    };

    if (!context.isGM && ["gm", "effects"].includes(this.tabGroups?.["sheet"] ?? "")) {
      this.tabGroups["sheet"] = ArmorSheetV2.TABS["sheet"].initial;
    }

    context.tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete context.tabs["gm"];
      delete context.tabs["effects"];
    }

    return context;
  }

  override async _onRender(
    context: AppV2RenderContext,
    options: AppV2RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);
    this.element
      .querySelectorAll<HTMLSelectElement>("[data-add-hit-location]")
      .forEach((el) => el.addEventListener("change", this.onAddHitLocation.bind(this)));
  }

  async onAddHitLocation(event: Event): Promise<void> {
    const target = event.currentTarget as HTMLSelectElement;
    const newRqid = convertFormValueToString(target.value);

    if (!this.document.system.hitLocationRqidLinks.some((l: RqidLink) => l.rqid === newRqid)) {
      const newName = getAvailableHitLocations().find((l) => l.rqid === target.value)?.name ?? "";
      const newHitLocationRqidLink = new RqidLink(newRqid, newName);
      const updatedLinks = [...this.document.system.hitLocationRqidLinks, newHitLocationRqidLink];
      await this.document.update({ system: { hitLocationRqidLinks: updatedLinks } });
    }
    this.render();
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as ArmorSheetV2;
    const data = formData.object as Record<string, unknown>;
    data["name"] =
      `${data["system.namePrefix"]} ${data["system.armorType"]} (${data["system.material"]})`;
    await sheet.document.update(data);
  }
}
