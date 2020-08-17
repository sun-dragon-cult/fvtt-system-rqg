import { PassionsEnum } from "../../data-model/item-data/passionData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class PassionSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Passion],
      template: "systems/rqg/module/item/passion-item/passionSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): ItemSheetData {
    const data = super.getData();
    data.data.passionTypes = Object.values(PassionsEnum);
    return data;
  }
}
