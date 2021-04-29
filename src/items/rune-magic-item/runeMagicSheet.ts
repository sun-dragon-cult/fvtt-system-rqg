import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  RuneMagicCastingRangeEnum,
  RuneMagicDurationEnum,
  RuneMagicItemData,
} from "../../data-model/item-data/runeMagicData";

import { RuneData } from "../../data-model/item-data/runeData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { getDomDataset, getRequiredDomDataset } from "../../system/util";
import { CultItemData } from "../../data-model/item-data/cultData";
import { RqgItemSheet } from "../RqgItemSheet";

export class RuneMagicSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.RuneMagic],
      template: "systems/rqg/items/rune-magic-item/runeMagicSheet.html",
      width: 425,
      height: 400,
    });
  }

  getData(): RuneMagicItemData {
    const sheetData = super.getData() as RuneMagicItemData;
    const data = sheetData.data;
    data.ranges = Object.values(RuneMagicCastingRangeEnum);
    data.durations = Object.values(RuneMagicDurationEnum);
    data.runes = Array.isArray(data.runes) ? data.runes : [data.runes];
    data.isOwned = this.item.isOwned;
    data.allRunes = game.settings.get("rqg", "runes") as Compendium.IndexEntry[];
    if (this.actor) {
      data.actorCults = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter((i: Item.Data<CultItemData>) => i.type === ItemTypeEnum.Cult);
      const cultRunes = data.cultId
        ? (this.actor.getOwnedItem(data.cultId) as Item<CultItemData>).data.data.runes
        : [];
      const runeChances = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: Item.Data<RuneData>) =>
            i.type === ItemTypeEnum.Rune &&
            (data.runes.includes(i.name) ||
              (data.runes.includes("Magic (condition)") && cultRunes.includes(i.name)))
        )
        .map((r: Item.Data<RuneData>) => r.data.chance);
      data.chance = Math.max(...runeChances);
    }
    return sheetData;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: string) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    formData["data.chance"] = Number(formData["data.chance"]);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery) {
    super.activateListeners(html);
    this.form?.addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    this.form?.querySelectorAll("[data-journal-id]").forEach((el) => {
      const elem = el as HTMLElement;
      const pack = getDomDataset($(elem), "journal-pack");
      const id = getRequiredDomDataset($(elem), "journal-id");
      elem.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error("Couldn't parse itemData");
      return;
    }
    if (droppedItemData.type !== "JournalEntry") {
      ui.notifications?.warn("You can only drop a journalEntry");
      return;
    }
    const pack = droppedItemData.pack ? droppedItemData.pack : "";
    await this.item.update({ "data.journalId": droppedItemData.id, "data.journalPack": pack }, {});
  }
}
