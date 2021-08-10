import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultData, CultRankEnum } from "../../data-model/item-data/cultData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { getAllRunesIndex, getDomDataset, getRequiredDomDataset } from "../../system/util";
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

  getData(): any {
    const context = super.getData() as any;
    const cultData = (context.cultData = context.data.data) as CultData;
    const sheetSpecific: any = (context.sheetSpecific = {});

    cultData.runes = Array.isArray(cultData.runes) ? cultData.runes : [cultData.runes];

    sheetSpecific.allRunes = getAllRunesIndex();
    sheetSpecific.ranksEnum = Object.values(CultRankEnum);
    if (cultData.journalId) {
      if (cultData.journalPack) {
        const pack = game.packs?.get(cultData.journalPack);
        // @ts-ignore
        sheetSpecific.journalEntryName = pack?.index.get(cultData.journalId)?.name;
      } else {
        sheetSpecific.journalEntryName = game.journal?.get(cultData.journalId)?.name;
      }
      if (!sheetSpecific.journalEntryName) {
        ui.notifications?.warn(
          "Cult description link not found - please make sure the journal exists or relink to another description"
        );
      }
    }
    return context;
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
      const pack = getDomDataset($(elem), "journal-pack");
      const id = getRequiredDomDataset($(elem), "journal-id");
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
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
