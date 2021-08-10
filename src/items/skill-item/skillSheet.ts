import { SkillCategoryEnum, SkillData } from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { RqgItemSheet } from "../RqgItemSheet";
import { getAllRunesIndex, RqgError } from "../../system/util";

export class SkillSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.html",
      width: 570,
      height: 350,
    });
  }

  getData(): any {
    const context = super.getData() as any;
    const skillData = (context.skillData = context.data.data) as SkillData;
    const sheetSpecific = (context.sheetSpecific = {} as any);
    if (skillData.journalId) {
      if (skillData.journalPack) {
        const pack = game.packs?.get(skillData.journalPack);
        // @ts-ignore
        sheetSpecific.journalEntryName = pack?.index.get(skillData.journalId)?.name;
      } else {
        sheetSpecific.journalEntryName = game.journal?.get(skillData.journalId)?.name;
      }
      if (!sheetSpecific.journalEntryName) {
        ui.notifications?.warn(
          "Skill description link not found - please make sure the journal exists or relink to another description"
        );
      }
    }

    if (!skillData.skillName) {
      skillData.skillName = context.data.name;
    }
    skillData.runes = Array.isArray(skillData.runes) ? skillData.runes : [skillData.runes];
    sheetSpecific.skillCategories = Object.values(SkillCategoryEnum);
    sheetSpecific.allRunes = getAllRunesIndex();
    return context;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const specialization = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
    formData["name"] =
      formData["data.skillName"] + specialization + " - " + formData["data.category"];

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
