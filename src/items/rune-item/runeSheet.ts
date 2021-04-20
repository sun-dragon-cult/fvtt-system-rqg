import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RuneItemData, RuneTypeEnum } from "../../data-model/item-data/runeData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { logBug } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";

export class RuneSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Rune],
      template: "systems/rqg/items/rune-item/runeSheet.html",
      width: 520,
      height: 250,
    });
  }

  async getData(): Promise<RuneItemData> {
    const sheetData = super.getData() as RuneItemData;
    const data = sheetData.data;
    if (!data.rune) {
      data.rune = sheetData.name;
    }
    const allRunesIndex = game.settings.get("rqg", "runes") as Compendium.IndexEntry[];
    data.allRunes = allRunesIndex.map((r) => r.name);
    data.runeTypes = Object.values(RuneTypeEnum);
    return sheetData;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
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
      const pack = el.dataset.journalPack;
      const id = el.dataset.journalId;
      if (id) {
        el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
      } else {
        logBug("Couldn't find linked journal from runeSheet", true, el, pack, id);
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
