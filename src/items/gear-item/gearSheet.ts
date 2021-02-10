import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { GearData } from "../../data-model/item-data/gearData";
import { equippedStatuses, physicalItemTypes } from "../../data-model/item-data/IPhysicalItem";

export class GearSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Gear],
      template: "systems/rqg/items/gear-item/gearSheet.html",
      width: 405,
      height: 400,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: GearData = sheetData.item.data;
    data.equippedStatuses = [...equippedStatuses];
    data.physicalItemTypes = [...physicalItemTypes];
    return sheetData;
  }

  protected async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    if (formData[`data.physicalItemType`] === "unique") {
      formData[`data.quantity`] = 1;
    }
    return super._updateObject(event, formData);
  }
}
