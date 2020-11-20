import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import {
  SpiritMagicCastingRangeEnum,
  SpiritMagicData,
  SpiritMagicDurationEnum,
  SpiritMagicConcentrationEnum,
} from "../../data-model/item-data/spiritMagicData";
import { RqgItemSheet } from "../RqgItemSheet";

export class SpiritMagicSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.SpiritMagic],
      template: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.html",
      width: 520,
      height: 250,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: SpiritMagicData = sheetData.item.data;
    data.ranges = Object.values(SpiritMagicCastingRangeEnum);
    data.durations = Object.values(SpiritMagicDurationEnum);
    data.types = Object.values(SpiritMagicConcentrationEnum);
    return sheetData;
  }
}
