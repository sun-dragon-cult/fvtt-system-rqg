import { SkillCategoryEnum, SkillData } from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { RqgActorSheet } from "../../actors/rqgActorSheet";

export class SkillSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplication.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.html",
      width: 370,
      height: 310,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: SkillData = sheetData.item.data;
    if (!data.skillName) {
      data.skillName = sheetData.item.name;
    }
    data.skillCategories = Object.values(SkillCategoryEnum);
    data.runes = Array.isArray(data.runes) ? data.runes : [data.runes];
    data.allRunes = game.settings.get("rqg", "runes");
    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    const specialization = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
    formData["name"] = formData["data.skillName"] + specialization;

    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
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
