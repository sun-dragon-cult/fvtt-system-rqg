import {
  PassionData,
  PassionsEnum,
} from "../../data-model/item-data/passionData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class PassionSheet extends ItemSheet {
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
    data.passionTypes = Object.values(PassionsEnum);
    return sheetData;
  }
}
