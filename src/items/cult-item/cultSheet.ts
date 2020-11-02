import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultData, CultRankEnum } from "../../data-model/item-data/cultData";

export class CultSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Cult],
      template: "systems/rqg/items/cult-item/cultSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: CultData = sheetData.item.data;

    data.ranksEnum = Object.values(CultRankEnum);
    return sheetData;
  }
}
