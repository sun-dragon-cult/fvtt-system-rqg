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
import { droppableJournalDescription } from "../isDroppable";

interface CultSheetData {
  isEmbedded: boolean;
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
      template: "systems/rqg/items/cult-item/cultSheet.hbs",
      width: 390,
      height: 530,
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
      isEmbedded: this.document.isEmbedded,
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
    await droppableJournalDescription(this.item, event);
  }
}
