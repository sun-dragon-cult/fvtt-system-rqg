import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class GearSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Gear],
      template: "systems/rqg/items/gear-item/gearSheet.html",
      width: 520,
      height: 250,
    });
  }

  // getData(): any {
  //   const sheetData: any = super.getData(); // Don't use directly - not reliably typed
  //   const data: GearData = sheetData.item.data;tor ? !this.actor.isPC : true;
  //   return sheetData;
  // }
}
