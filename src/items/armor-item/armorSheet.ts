import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ArmorData } from "../../data-model/item-data/armorData";

export class ArmorSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Armor],
      template: "systems/rqg/items/armor-item/armorSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: ArmorData = sheetData.item.data;
    // Make an editable comma separated text of the hit locations array
    data.hitLocationsCSV = data.hitLocations.join();
    return sheetData;
  }

  protected _updateObject(
    event: Event | JQuery.Event,
    formData: any
  ): Promise<any> {
    // Split the hitlocationsCSV into an array
    formData["data.hitLocations"] = formData["data.hitLocationsCSV"].split(",");
    delete formData["data.hitLocationsCSV"];
    return super._updateObject(event, formData);
  }
}
