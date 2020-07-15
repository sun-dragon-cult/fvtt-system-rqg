import { passionType } from "../data-model/item-data/itemTypes";
import { PassionsEnum } from "../data-model/item-data/passion";

export class PassionSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", passionType],
      template: "systems/rqg/module/item/passion-sheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): ItemSheetData {
    const data = super.getData();
    data.data.passionTypes = Object.keys(PassionsEnum);
    return data;
  }
}
