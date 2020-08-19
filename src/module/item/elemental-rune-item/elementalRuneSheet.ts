import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ElementalRuneEnum } from "../../data-model/item-data/elementalRuneData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class ElementalRuneSheet extends ItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.ElementalRune],
      template:
        "systems/rqg/module/item/elemental-rune-item/elementalRuneSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): ItemSheetData {
    const data = super.getData();
    data.data.elementalRuneTypes = Object.values(ElementalRuneEnum);
    return data;
  }
}
