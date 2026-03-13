import { CultRankEnum, type CultItem } from "@item-model/cultData.ts";
import {
  isTruthy,
  getRequiredDomDataset,
  formatListByWorldLanguage,
  getSelectRuneOptions,
} from "../../system/util";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface CultSheetContext extends RqgItemSheetContext {
  allRuneOptions: SelectOptionData<string>[];
  rankOptions: SelectOptionData<string>[];
  enrichedGifts: string;
  enrichedGeases: string;
  enrichedSubCults: string;
  enrichedHolyDays: string;
}

export class CultSheetV2 extends RqgItemSheetV2 {
  override get document(): CultItem {
    return super.document as CultItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "cult"],
    position: { width: 700, height: 500 },
    form: { handler: CultSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.itemCultSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    deity: { template: templatePaths.itemCultSheetV2Deity, scrollable: [""] },
    giftsandgeases: { template: templatePaths.itemCultSheetV2GiftsGeases, scrollable: [""] },
    cults: { template: templatePaths.itemCultSheetV2Cults, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "deity", label: "RQG.Item.SheetTab.Deity" },
        { id: "giftsandgeases", label: "RQG.Item.SheetTab.GiftsAndGeases" },
        { id: "cults", label: "RQG.Item.SheetTab.Cults" },
      ],
      initial: "deity",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<CultSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    if (!system.deity) {
      system.deity = this.document.name;
    }

    const context: CultSheetContext = {
      ...base,
      enrichedGifts: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gifts,
      ),
      enrichedGeases: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.geases,
      ),
      enrichedSubCults: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.subCults,
      ),
      enrichedHolyDays: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.holyDays,
      ),
      rankOptions: Object.values(CultRankEnum).map((cr) => ({
        value: cr,
        label: "RQG.Actor.RuneMagic.CultRank." + cr,
      })),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Cult.AddCultRunePlaceholder"),
    };

    (context as any).tabs = this._prepareTabs("sheet");

    return context;
  }

  override async _preparePartContext(partId: string, context: any, options: any): Promise<any> {
    context = await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) {
      context.tab = context.tabs[partId];
    }
    return context;
  }

  override async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);

    this.element.querySelectorAll<HTMLElement>("[data-add-cult]").forEach((el) => {
      el.addEventListener("click", async () => {
        this.document.system.joinedCults.push({
          rank: CultRankEnum.LayMember,
          cultName: undefined,
          tagline: "",
        });
        await this.document.update({
          system: { joinedCults: this.document.system.joinedCults },
        });
      });
    });

    this.element.querySelectorAll<HTMLElement>("[data-delete-cult]").forEach((el) => {
      el.addEventListener("click", async () => {
        const indexToDelete = Number(getRequiredDomDataset(el, "delete-cult"));
        this.document.system.joinedCults.splice(indexToDelete, 1);
        const newName = this.deriveItemName();
        await this.document.update({
          name: newName,
          system: { joinedCults: this.document.system.joinedCults },
        });
      });
    });
  }

  deriveItemName(): string {
    return CultSheetV2.deriveItemName(
      this.document.system.deity ?? "",
      this.document.system.joinedCults.map((c: any) => c.cultName),
    );
  }

  static deriveItemName(deity: string, cultNames: string[]): string {
    const joinedCultsFormatted = formatListByWorldLanguage(
      cultNames.filter(isTruthy).map((c) => c.trim()),
    );

    if (!joinedCultsFormatted || joinedCultsFormatted === deity) {
      return deity.trim();
    }
    return joinedCultsFormatted + ` (${deity.trim()})`;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as CultSheetV2;
    const data = formData.object as Record<string, unknown>;

    const formCultName = data["system.joinedCults.cultName"];
    const formTagLine = data["system.joinedCults.tagline"];
    const formRank = data["system.joinedCults.rank"];

    let cultNames = Array.isArray(formCultName) ? formCultName : [formCultName];
    const taglines = Array.isArray(formTagLine) ? formTagLine : [formTagLine];
    const ranks = Array.isArray(formRank) ? formRank : [formRank];

    cultNames = cultNames.map((name) => name || data["system.deity"]);

    data["system.joinedCults"] = ranks.map((rank: any, index: number) => ({
      cultName: cultNames[index],
      tagline: taglines[index],
      rank: rank,
    }));

    data["name"] = CultSheetV2.deriveItemName(
      data["system.deity"] as string,
      cultNames as string[],
    );

    await sheet.document.update(data);
  }
}
