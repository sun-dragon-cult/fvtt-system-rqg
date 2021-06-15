import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  ArmorItemData,
  armorTypeTranslationKeys,
  materialTranslationKeys,
} from "../../data-model/item-data/armorData";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { HitLocationsEnum } from "../../data-model/item-data/hitLocationData";

export class ArmorSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Armor],
      template: "systems/rqg/items/armor-item/armorSheet.html",
      width: 625,
      height: 557,
    });
  }

  async getData(): Promise<ArmorItemData> {
    const sheetData = super.getData() as ArmorItemData;
    const data = sheetData.data;

    data.allHitLocations = Object.values(HitLocationsEnum);
    data.equippedStatuses = [...equippedStatuses];
    sheetData.data.armorTypeNames = armorTypeTranslationKeys.map((key) => game.i18n.localize(key));
    sheetData.data.materialNames = materialTranslationKeys.map((key) => game.i18n.localize(key));
    return sheetData;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    let hitLocations = formData["data.hitLocations"];
    hitLocations = Array.isArray(hitLocations) ? hitLocations : [hitLocations];
    hitLocations = [...new Set(hitLocations.filter((r: any) => r))]; // Remove empty & duplicates
    formData[
      "name"
    ] = `${formData["data.namePrefix"]} ${formData["data.armorType"]} (${formData["data.material"]})`;
    formData["data.hitLocations"] = duplicate(hitLocations);
    return super._updateObject(event, formData);
  }
}
