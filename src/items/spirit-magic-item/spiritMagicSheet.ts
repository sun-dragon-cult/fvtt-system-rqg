import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  SpiritMagicCastingRangeEnum,
  SpiritMagicDurationEnum,
  SpiritMagicConcentrationEnum,
  SpiritMagicItemData,
  SpiritMagicData,
} from "../../data-model/item-data/spiritMagicData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { RqgError } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";

export class SpiritMagicSheet extends RqgItemSheet {
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
    const context = super.getData() as any;
    const spiritMagicData = (context.spiritMagicData = context.data.data) as SpiritMagicData;
    const sheetSpecific: any = (context.sheetSpecific = {});

    sheetSpecific.ranges = Object.values(SpiritMagicCastingRangeEnum);
    sheetSpecific.durations = Object.values(SpiritMagicDurationEnum);
    sheetSpecific.types = Object.values(SpiritMagicConcentrationEnum);
    return context;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    (this.form as HTMLElement).querySelectorAll("[data-journal-id]").forEach((el: Element) => {
      const elem = el as HTMLElement;
      const pack = elem.dataset.journalPack;
      const id = elem.dataset.journalId;
      if (!id) {
        const msg = "Couldn't find linked journal entry from Spirit magic sheet";
        ui.notifications?.error(msg);
        throw new RqgError(msg, elem, pack, id);
      }
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
