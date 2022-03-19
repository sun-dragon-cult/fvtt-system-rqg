import { HomelandDataProperties, HomelandDataPropertiesData } from "../../data-model/item-data/homelandData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, getGameUser } from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";


export interface HomelandSheetData extends RqgItemSheetData {
    isEmbedded: boolean;  // There might be no reason to actually embed Homeland items!
    data: HomelandDataProperties;
    homelandData: HomelandDataPropertiesData;
    sheetSpecific: {}
}

export class HomelandSheet extends RqgItemSheet<ItemSheet.Options, HomelandSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Homeland],
      template: "systems/rqg/items/homeland-item/homelandSheet.hbs",
      width: 450,
      height: 500,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "homeland" }],
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
    formData["name"] = formData["data.homeland"] + region;
    return super._updateObject(event, formData);
  }
}