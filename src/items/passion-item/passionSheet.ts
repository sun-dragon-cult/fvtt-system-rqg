import {
  PassionDataProperties,
  PassionDataPropertiesData,
  PassionsEnum,
} from "../../data-model/item-data/passionData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType } from "../../system/util";

export interface PassionSheetData {
  data: PassionDataProperties; // Actually contains more...complete with effects, flags etc
  passionData: PassionDataPropertiesData;
  sheetSpecific: {
    passionTypes: PassionsEnum[];
  };
}

export class PassionSheet extends RqgItemSheet<
  ItemSheet.Options,
  PassionSheetData | ItemSheet.Data
> {
  // TODO move to config?
  static passionImgUrl = new Map([
    [PassionsEnum.Cowardly, "systems/rqg/assets/images/passion/cowardly.svg"],
    [PassionsEnum.Devotion, "systems/rqg/assets/images/passion/devotion.svg"],
    [PassionsEnum.Fear, "systems/rqg/assets/images/passion/fear.svg"],
    [PassionsEnum.Hate, "systems/rqg/assets/images/passion/hate.svg"],
    [PassionsEnum.Honor, "systems/rqg/assets/images/passion/honor.svg"],
    [PassionsEnum.Loyalty, "systems/rqg/assets/images/passion/loyalty.svg"],
    [PassionsEnum.Love, "systems/rqg/assets/images/passion/love.svg"],
  ]);

  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Passion],
      template: "systems/rqg/items/passion-item/passionSheet.html",
      width: 490,
      height: 310,
    });
  }

  getData(): PassionSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Passion);

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      options: this.options,
      data: itemData,
      passionData: itemData.data,
      sheetSpecific: {
        passionTypes: Object.values(PassionsEnum),
      },
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const subject = formData["data.subject"] ? ` (${formData["data.subject"]})` : "";
    formData["name"] = formData["data.passion"] + subject;
    formData["img"] = PassionSheet.passionImgUrl.get(formData["data.passion"]);
    return super._updateObject(event, formData);
  }
}
