import { SkillCategoryEnum, SkillItemData } from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgError } from "../../system/util";

export class SkillSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.html",
      width: 370,
      height: 310,
    });
  }

  getData(): SkillItemData {
    const sheetData = super.getData() as SkillItemData;
    const data = sheetData.data;
    if (!data.skillName) {
      data.skillName = sheetData.name;
    }
    data.skillCategories = Object.values(SkillCategoryEnum);
    data.runes = Array.isArray(data.runes) ? data.runes : [data.runes];
    data.allRunes = game.settings.get("rqg", "runes") as Compendium.IndexEntry[];
    return sheetData;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const specialization = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
    formData["name"] = formData["data.skillName"] + specialization;

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
      if (!id) {
        const msg = "couldn't find linked journal entry from Skill Item Sheet";
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
