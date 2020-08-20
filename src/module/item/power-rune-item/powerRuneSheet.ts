import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  PowerRuneData,
  PowerRuneEnum,
} from "../../data-model/item-data/powerRuneData";

export class PowerRuneSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.PowerRune],
      template: "systems/rqg/module/item/power-rune-item/powerRuneSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: PowerRuneData = sheetData.item.data;
    data.powerRuneTypes = Object.values(PowerRuneEnum);
    return sheetData;
  }
}
