import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultRankEnum } from "../../data-model/item-data/cultData";
import { getAvailableRunes, getGameUser, AvailableRuneCache } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";

interface CultSheetData {
  allRunes: AvailableRuneCache[];
  ranksEnum: CultRankEnum[];
  enrichedGifts: string;
  enrichedGeases: string;
  enrichedSubCults: string;
  enrichedHolyDays: string;
}

export class CultSheet extends RqgItemSheet<ItemSheet.Options, CultSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Cult],
      template: "systems/rqg/items/cult-item/cultSheet.hbs",
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "cult-standing",
        },
      ],
    });
  }

  async getData(): Promise<CultSheetData & ItemSheetData> {
    const system = duplicate(this.document.system);
    system.runes = Array.isArray(system.runes) ? system.runes : [system.runes];

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      isGM: getGameUser().isGM,
      system: system,
      // @ts-expect-error async
      enrichedGifts: await TextEditor.enrichHTML(system.gifts, { async: true }),
      // @ts-expect-error async
      enrichedGeases: await TextEditor.enrichHTML(system.geases, { async: true }),
      // @ts-expect-error async
      enrichedSubCults: await TextEditor.enrichHTML(system.subCults, { async: true }),
      // @ts-expect-error async
      enrichedHolyDays: await TextEditor.enrichHTML(system.holyDays, { async: true }),
      allRunes: getAvailableRunes(),
      // journalEntryName: system.descriptionRqidLink.name,
      ranksEnum: Object.values(CultRankEnum),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    let runes = formData["system.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: any) => r); // Remove empty
    formData["system.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    await super._onDrop(event);
  }
}
