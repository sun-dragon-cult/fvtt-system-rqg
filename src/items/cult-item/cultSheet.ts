import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  CultDataProperties,
  CultDataPropertiesData,
  CultRankEnum,
} from "../../data-model/item-data/cultData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import {
  assertItemType,
  getAllRunesIndex,
  getDomDataset,
  getJournalEntryName,
  getRequiredDomDataset,
} from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { RqgItem } from "../rqgItem";

interface CultSheetData {
  data: CultDataProperties; // Actually contains more...complete with effects, flags etc
  cultData: CultDataPropertiesData;
  sheetSpecific: {
    allRunes: IndexTypeForMetadata<CompendiumCollection.Metadata>;
    journalEntryName: string;
    ranksEnum: CultRankEnum[];
  };
}

export class CultSheet extends RqgItemSheet<ItemSheet.Options, CultSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Cult],
      template: "systems/rqg/items/cult-item/cultSheet.html",
      width: 500,
      height: 580,
    });
  }

  getData(): CultSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Cult);

    const cultData = itemData.data;
    cultData.runes = Array.isArray(cultData.runes) ? cultData.runes : [cultData.runes];

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      options: this.options,
      data: itemData,
      cultData: itemData.data,
      sheetSpecific: {
        allRunes: getAllRunesIndex(),
        journalEntryName: getJournalEntryName(cultData),
        ranksEnum: Object.values(CultRankEnum),
      },
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
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
