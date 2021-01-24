import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ArmorData } from "../../data-model/item-data/armorData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class ArmorSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Armor],
      template: "systems/rqg/items/armor-item/armorSheet.html",
      width: 350,
      height: 390,
    });
  }

  // @ts-ignore
  async getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: ArmorData = sheetData.item.data;

    try {
      const hitLocationsCompendium = game.settings.get("rqg", "hitLocationsCompendium");
      data.allHitLocations = await game.packs.get(hitLocationsCompendium).getIndex();
    } catch (err) {
      data.allHitLocations = [];
    }
    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    let hitLocations = formData["data.hitLocations"];
    hitLocations = Array.isArray(hitLocations) ? hitLocations : [hitLocations];
    hitLocations = [...new Set(hitLocations.filter((r) => r))]; // Remove empty & duplicates
    formData["data.hitLocations"] = duplicate(hitLocations);
    return super._updateObject(event, formData);
  }
}
