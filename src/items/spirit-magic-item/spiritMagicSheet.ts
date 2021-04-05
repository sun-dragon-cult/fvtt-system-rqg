import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  SpiritMagicCastingRangeEnum,
  SpiritMagicDurationEnum,
  SpiritMagicConcentrationEnum,
  SpiritMagicItemData,
} from "../../data-model/item-data/spiritMagicData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { logBug } from "../../system/util";

export class SpiritMagicSheet extends ItemSheet<SpiritMagicItemData> {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.SpiritMagic],
      template: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): SpiritMagicItemData {
    const sheetData = super.getData() as SpiritMagicItemData;
    const data = sheetData.data;
    data.ranges = Object.values(SpiritMagicCastingRangeEnum);
    data.durations = Object.values(SpiritMagicDurationEnum);
    data.types = Object.values(SpiritMagicConcentrationEnum);
    return sheetData;
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
        logBug("Couldn't find linked journal entry from Spirit magic sheet", elem, pack, id);
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
