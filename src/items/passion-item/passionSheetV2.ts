import { PassionsEnum, type PassionItem } from "@item-model/passionData.ts";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface PassionSheetContext extends RqgItemSheetContext {
  enrichedDescription: string;
  enrichedGmNotes: string;
  passionTypes: PassionsEnum[];
}

export class PassionSheetV2 extends RqgItemSheetV2 {
  /** Map passion type → image path */
  static passionImgUrl = new Map([
    [PassionsEnum.Ambition, "systems/rqg/assets/images/passion/ambition.svg"],
    [PassionsEnum.Cowardly, "systems/rqg/assets/images/passion/cowardly.svg"],
    [PassionsEnum.Devotion, "systems/rqg/assets/images/passion/devotion.svg"],
    [PassionsEnum.Fear, "systems/rqg/assets/images/passion/fear.svg"],
    [PassionsEnum.Gluttony, "systems/rqg/assets/images/passion/gluttony.svg"],
    [PassionsEnum.Hate, "systems/rqg/assets/images/passion/hate.svg"],
    [PassionsEnum.Honor, "systems/rqg/assets/images/passion/honor.svg"],
    [PassionsEnum.Loyalty, "systems/rqg/assets/images/passion/loyalty.svg"],
    [PassionsEnum.Love, "systems/rqg/assets/images/passion/love.svg"],
    [PassionsEnum.Vanity, "systems/rqg/assets/images/passion/vanity.svg"],
  ]);

  override get document(): PassionItem {
    return super.document as PassionItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "passion"],
    position: { width: 600, height: 310 },
    form: { handler: PassionSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.itemPassionSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    passion: { template: templatePaths.itemPassionSheetV2Passion, scrollable: [""] },
    backstory: { template: templatePaths.itemPassionSheetV2Backstory, scrollable: [""] },
    gm: { template: templatePaths.itemPassionSheetV2Gm, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "passion", label: "RQG.Item.SheetTab.Passion" },
        { id: "backstory", label: "RQG.Item.Passion.BackStory" },
        { id: "gm", label: "RQG.Item.SheetTab.GMNotes" },
      ],
      initial: "passion",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<PassionSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    const context: PassionSheetContext = {
      ...base,
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
      passionTypes: Object.values(PassionsEnum),
    };

    if (!context.isGM && this.tabGroups?.["sheet"] === "gm") {
      this.tabGroups["sheet"] = PassionSheetV2.TABS["sheet"].initial;
    }

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete (context as any).tabs.gm;
    }

    return context;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as PassionSheetV2;
    const data = formData.object as Record<string, unknown>;

    const subject = data["system.subject"] ? ` (${data["system.subject"]})` : "";
    data["name"] = String(data["system.passion"]) + subject;

    if (Object.values(PassionsEnum).includes(data["system.passion"] as PassionsEnum)) {
      const img = PassionSheetV2.passionImgUrl.get(data["system.passion"] as string as any);
      if (img) {
        data["img"] = img;
      }
    }

    await sheet.document.update(data);
  }
}
