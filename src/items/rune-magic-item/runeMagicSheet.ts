import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  RuneMagicCastingRangeEnum,
  RuneMagicData,
  RuneMagicDurationEnum,
} from "../../data-model/item-data/runeMagicData";

import { RuneData } from "../../data-model/item-data/runeData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { getDomDataset, getRequiredDomDataset } from "../../system/util";
import { CultItemData } from "../../data-model/item-data/cultData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgItem } from "../rqgItem";

type RuneMagicSheetSpecificData = {
  isOwned?: boolean;
  ranges?: string[];
  durations?: string[];
  actorCults?: any[];
  allRunes?: any[]; // For select on sheet {_id: , name:, img: }
};

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

  getData(): any {
    const context = super.getData() as any;
    const runeMagicData = (context.runeMagicData = context.data.data) as RuneMagicData;
    const sheetSpecific = (context.sheetSpecific = {} as RuneMagicSheetSpecificData);

    sheetSpecific.ranges = Object.values(RuneMagicCastingRangeEnum);
    sheetSpecific.durations = Object.values(RuneMagicDurationEnum);
    runeMagicData.runes = Array.isArray(runeMagicData.runes)
      ? runeMagicData.runes
      : [runeMagicData.runes];
    // @ts-ignore 0.8 isOwned -> isEmbedded
    sheetSpecific.isOwned = this.item.isEmbedded;
    sheetSpecific.allRunes = game.settings.get("rqg", "runes") as Compendium.IndexEntry[];
    if (this.actor) {
      sheetSpecific.actorCults = this.actor
        .getEmbeddedCollection("Item")
        .filter((i: RqgItem) => i.type === ItemTypeEnum.Cult);
      const cultRunes = runeMagicData.cultId
        ? (this.actor.items.get(runeMagicData.cultId) as Item<CultItemData>).data.data.runes
        : [];
      const runeChances = this.actor
        .getEmbeddedCollection("Item")
        .filter(
          (i: RqgItem) =>
            i.data.type === ItemTypeEnum.Rune &&
            (runeMagicData.runes.includes(i.name) ||
              (runeMagicData.runes.includes("Magic (condition)") && cultRunes.includes(i.name)))
        )
        .map((r: Item.Data<RuneData>) => r.data.chance);
      runeMagicData.chance = Math.max(...runeChances);
    }
    console.log("runemagic shetetr", context);
    return context;
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
