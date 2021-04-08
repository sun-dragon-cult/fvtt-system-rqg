import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultData, CultItemData, CultRankEnum } from "../../data-model/item-data/cultData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { logBug } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";

export class CultSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Cult],
      template: "systems/rqg/items/cult-item/cultSheet.html",
      width: 500,
      height: 580,
    });
  }

  getData(): CultItemData {
    const sheetData = super.getData() as CultItemData;
    const data: CultData = sheetData.data;
    data.runes = Array.isArray(data.runes) ? data.runes : [data.runes];
    data.allRunes = game.settings.get("rqg", "runes") as Compendium.IndexEntry[];
    data.ranksEnum = Object.values(CultRankEnum);
    return sheetData;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: any) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    (this.form as HTMLElement).querySelectorAll("[data-journal-id]").forEach((el: Element) => {
      const elem = el as HTMLElement;
      const pack = elem.dataset.journalPack;
      const id = elem.dataset.journalId;
      if (id) {
        el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
      } else {
        logBug("Couldn't find linked journal Entry in Cult Item Sheet", elem, pack, id);
      }
    });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      return;
    }
    if (droppedItemData.type === "JournalEntry") {
      const pack = droppedItemData.pack ? droppedItemData.pack : "";
      await this.item.update(
        { "data.journalId": droppedItemData.id, "data.journalPack": pack },
        {}
      );
    } else {
      ui.notifications?.warn("You can only drop a journalEntry");
    }
  }
}
