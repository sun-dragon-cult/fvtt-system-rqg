import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";
import {
  RuneData,
  RuneEnum,
  RuneTypeEnum,
} from "../../data-model/item-data/runeData";

export class RuneSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Rune],
      template: "systems/rqg/items/rune-item/runeSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: RuneData = sheetData.item.data;
    data.runes = Object.values(RuneEnum);
    data.runeTypes = Object.values(RuneTypeEnum);
    return sheetData;
  }
}
