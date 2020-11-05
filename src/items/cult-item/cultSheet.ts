import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultData, CultRankEnum } from "../../data-model/item-data/cultData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class CultSheet extends RqgItemSheet<RqgActorData, RqgItem> {
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
