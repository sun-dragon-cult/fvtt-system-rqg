import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  ArmorDataProperties,
  ArmorDataPropertiesData,
  armorTypeTranslationKeys,
  materialTranslationKeys,
} from "../../data-model/item-data/armorData";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType, getGame, getHitLocations } from "../../system/util";
import { RqgItem } from "../rqgItem";

interface ArmorSheetData {
  isEmbedded: boolean;
  data: ArmorDataProperties; // Actually contains more...complete with effects, flags etc
  armorData: ArmorDataPropertiesData;
  sheetSpecific: {
    allHitLocations: string[];
    equippedStatuses: string[];
    armorTypeNames: string[];
    materialNames: string[];
  };
}

export class ArmorSheet extends RqgItemSheet<ItemSheet.Options, ArmorSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Armor],
      template: "systems/rqg/items/armor-item/armorSheet.html",
      width: 580,
      height: 725,
    });
  }

  getData(): ArmorSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Armor);
    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      armorData: itemData.data,
      sheetSpecific: {
        allHitLocations: getHitLocations(),
        equippedStatuses: [...equippedStatuses],
        armorTypeNames: armorTypeTranslationKeys.map((key) => getGame().i18n.localize(key)),
        materialNames: materialTranslationKeys.map((key) => getGame().i18n.localize(key)),
      },
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
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
