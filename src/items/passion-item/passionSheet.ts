import { PassionData, PassionsEnum } from "../../data-model/item-data/passionData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";

export class PassionSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Passion],
      template: "systems/rqg/items/passion-item/passionSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: PassionData = sheetData.item.data;
    if (!data.subject) {
      data.subject = sheetData.item.name;
    }
    data.passionTypes = Object.values(PassionsEnum);
    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    const subject = formData["data.subject"] ? ` (${formData["data.subject"]})` : "";
    formData["name"] = formData["data.passion"] + subject;
    return super._updateObject(event, formData);
  }
}
