import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationData,
  HitLocationsEnum,
} from "../../data-model/item-data/hitLocationData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class HitLocationSheet extends ItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template:
        "systems/rqg/module/item/hit-location-item/hitLocationSheet.html",
      width: 520,
      height: 250,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): ItemSheetData {
    const data: ItemData<HitLocationData> = super.getData() as ItemData;
    data.data.hitLocationTypes = Object.values(HitLocationsEnum);
    return data;
  }
}
