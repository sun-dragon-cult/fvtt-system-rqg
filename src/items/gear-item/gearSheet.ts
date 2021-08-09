import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { GearData } from "../../data-model/item-data/gearData";
import { equippedStatuses, physicalItemTypes } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";

export class GearSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Gear],
      template: "systems/rqg/items/gear-item/gearSheet.html",
      width: 405,
      height: 400,
    });
  }

  getData(): any {
    const context = super.getData() as any;
    const gearData = (context.gearData = context.data.data) as GearData;
    const sheetSpecific: any = (context.sheetSpecific = {});

    sheetSpecific.equippedStatuses = [...equippedStatuses];
    sheetSpecific.physicalItemTypes = [...physicalItemTypes];
    return context;
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    if (formData[`data.physicalItemType`] === "unique") {
      formData[`data.quantity`] = 1;
    }
    return super._updateObject(event, formData);
  }
}
