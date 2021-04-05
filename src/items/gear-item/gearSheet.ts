import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { GearItemData } from "../../data-model/item-data/gearData";
import { equippedStatuses, physicalItemTypes } from "../../data-model/item-data/IPhysicalItem";

export class GearSheet extends ItemSheet<GearItemData> {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Gear],
      template: "systems/rqg/items/gear-item/gearSheet.html",
      width: 405,
      height: 400,
    });
  }

  getData(): GearItemData {
    const sheetData = super.getData() as GearItemData;
    const data = sheetData.data;
    data.equippedStatuses = [...equippedStatuses];
    data.physicalItemTypes = [...physicalItemTypes];
    return sheetData;
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    if (formData[`data.physicalItemType`] === "unique") {
      formData[`data.quantity`] = 1;
    }
    return super._updateObject(event, formData);
  }
}
