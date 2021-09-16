import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { GearDataProperties, GearDataPropertiesData } from "../../data-model/item-data/gearData";
import { equippedStatuses, physicalItemTypes } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType } from "../../system/util";

interface GearSheetData {
  isEmbedded: boolean;
  data: GearDataProperties; // Actually contains more...complete with effects, flags etc
  gearData: GearDataPropertiesData;

  sheetSpecific: {
    equippedStatuses: typeof equippedStatuses;
    physicalItemTypes: typeof physicalItemTypes;
  };
}

export class GearSheet extends RqgItemSheet<ItemSheet.Options, GearSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Gear],
      template: "systems/rqg/items/gear-item/gearSheet.html",
      width: 420,
      height: 580,
    });
  }

  getData(): GearSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Gear);
    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      gearData: itemData.data,
      sheetSpecific: {
        equippedStatuses: [...equippedStatuses],
        physicalItemTypes: [...physicalItemTypes],
      },
    };
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    if (formData[`data.physicalItemType`] === "unique") {
      formData[`data.quantity`] = 1;
    }
    return super._updateObject(event, formData);
  }
}
