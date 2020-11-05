import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  ElementalRuneData,
  ElementalRuneEnum,
} from "../../data-model/item-data/elementalRuneData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";

export class ElementalRuneSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.ElementalRune],
      template: "systems/rqg/items/elemental-rune-item/elementalRuneSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: ElementalRuneData = sheetData.item.data;
    data.elementalRuneTypes = Object.values(ElementalRuneEnum);
    return sheetData;
  }
}
