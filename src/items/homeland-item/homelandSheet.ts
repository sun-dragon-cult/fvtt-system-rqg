import {
  HomelandDataProperties,
  HomelandDataPropertiesData,
  HomelandDataSourceData,
} from "../../data-model/item-data/homelandData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, getDomDataset, getGameUser, localize } from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { systemId } from "../../system/config";

export interface HomelandSheetData extends RqgItemSheetData {
  isEmbedded: boolean; // There might be no reason to actually embed Homeland items!
  data: HomelandDataProperties;
  homelandData: HomelandDataPropertiesData;
  sheetSpecific: {};
}

export class HomelandSheet extends RqgItemSheet<
  ItemSheet.Options,
  HomelandSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ItemTypeEnum.Homeland],
      template: "systems/rqg/items/homeland-item/homelandSheet.hbs",
      width: 550,
      height: 850,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "homeland",
        },
      ],
    });
  }

  getData(): HomelandSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Homeland);

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      homelandData: itemData.data,
      sheetSpecific: {},
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const region = formData["data.region"] ? ` (${formData["data.region"]})` : "";
    const newName = formData["data.homeland"] + region;
    if (newName) {
      // If there's nothing in the homeland or region, don't rename
      formData["name"] = newName;
    }
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

    form.addEventListener("drop", this._onDrop.bind(this));
  }
}
