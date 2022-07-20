import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  CultDataProperties,
  CultDataPropertiesData,
  CultRankEnum,
} from "../../data-model/item-data/cultData";
import {
  assertItemType,
  getAllRunesIndex,
  getGameUser,
  getJournalEntryName,
} from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";

interface CultSheetData extends RqgItemSheetData {
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
      classes: [systemId, "sheet", ItemTypeEnum.Cult],
      template: "systems/rqg/items/cult-item/cultSheet.hbs",
      width: 450,
      height: 650,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "cult-standing",
        },
      ],
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
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
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
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    await super._onDrop(event);
  }
}
