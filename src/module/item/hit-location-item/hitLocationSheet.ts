import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { HitLocationsEnum } from "../../data-model/item-data/hitLocationData";

export class HitLocationSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template:
        "systems/rqg/module/item/hit-location-item/hitLocationSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): ItemSheetData {
    const data = super.getData();
    data.data.hitLocationTypes = Object.values(HitLocationsEnum);
    return data;
  }
}
