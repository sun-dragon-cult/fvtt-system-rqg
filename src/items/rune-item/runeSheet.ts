import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  RuneDataProperties,
  RuneDataPropertiesData,
  RuneTypeEnum,
} from "../../data-model/item-data/runeData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import {
  assertItemType,
  getAllRunesIndex,
  getDomDataset,
  getJournalEntryName,
  getRequiredDomDataset,
} from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgItem } from "../rqgItem";

interface RuneSheetData {
  data: RuneDataProperties; // Actually contains more...complete with effects, flags etc
  runeData: RuneDataPropertiesData;
  sheetSpecific: {
    allRunes: string[];
    runeTypes: RuneTypeEnum[];
    journalEntryName: string;
  };
}

export class RuneSheet extends RqgItemSheet<ItemSheet.Options, RuneSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Rune],
      template: "systems/rqg/items/rune-item/runeSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): RuneSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Rune);

    const runeData = itemData.data;
    if (!runeData.rune) {
      runeData.rune = itemData.name;
    }

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      runeData: itemData.data,
      sheetSpecific: {
        // @ts-ignore name
        allRunes: getAllRunesIndex().map((r) => r.name),
        runeTypes: Object.values(RuneTypeEnum),
        journalEntryName: getJournalEntryName(runeData),
      },
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    formData["name"] = `${formData["data.rune"]} (${formData["data.runeType"]})`;

    let minorRunes = formData["data.minorRunes"];
    minorRunes = Array.isArray(minorRunes) ? minorRunes : [minorRunes];
    minorRunes = [...new Set(minorRunes.filter((r: any) => r))]; // Remove empty & duplicates
    formData["data.minorRunes"] = duplicate(minorRunes);

    formData["data.chance"] = Number(formData["data.chance"]);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

    form.addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    form.querySelectorAll("[data-journal-id]").forEach((element) => {
      const el = element as HTMLElement;
      const pack = getDomDataset($(el), "journal-pack");
      const id = getRequiredDomDataset($(el), "journal-id");
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
