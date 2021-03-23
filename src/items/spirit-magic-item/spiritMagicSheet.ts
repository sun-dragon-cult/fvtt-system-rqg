import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import {
  SpiritMagicCastingRangeEnum,
  SpiritMagicData,
  SpiritMagicDurationEnum,
  SpiritMagicConcentrationEnum,
} from "../../data-model/item-data/spiritMagicData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorSheet } from "../../actors/rqgActorSheet";

export class SpiritMagicSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplication.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.SpiritMagic],
      template: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.html",
      width: 520,
      height: 250,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: SpiritMagicData = sheetData.item.data;
    data.ranges = Object.values(SpiritMagicCastingRangeEnum);
    data.durations = Object.values(SpiritMagicDurationEnum);
    data.types = Object.values(SpiritMagicConcentrationEnum);
    return sheetData;
  }

  protected activateListeners(html: JQuery) {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    (this.form as HTMLElement).querySelectorAll("[data-journal-id]").forEach((el: HTMLElement) => {
      const pack = el.dataset.journalPack;
      const id = el.dataset.journalId;
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });
  }

  protected async _onDrop(event: DragEvent) {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }
    if (droppedItemData.type === "JournalEntry") {
      const pack = droppedItemData.pack ? droppedItemData.pack : "";
      await this.item.update(
        { "data.journalId": droppedItemData.id, "data.journalPack": pack },
        {}
      );
    } else {
      ui.notifications.warn("You can only drop a journalEntry");
    }
  }
}
