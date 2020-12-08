import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { RuneData, RuneTypeEnum } from "../../data-model/item-data/runeData";

export class RuneSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Rune],
      template: "systems/rqg/items/rune-item/runeSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: RuneData = sheetData.item.data;
    if (!data.rune) {
      data.rune = sheetData.item.name;
    }
    const allRunesIndex = game.settings.get("rqg", "runes");
    data.allRunes = allRunesIndex !== {} ? allRunesIndex.map((r) => r.name) : [];
    data.runeTypes = Object.values(RuneTypeEnum);
    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    formData["name"] = `${formData["data.rune"]} (${formData["data.runeType"]})`;

    let minorRunes = formData["data.minorRunes"];
    minorRunes = Array.isArray(minorRunes) ? minorRunes : [minorRunes];
    minorRunes = [...new Set(minorRunes.filter((r) => r))]; // Remove empty & duplicates
    formData["data.minorRunes"] = duplicate(minorRunes);

    formData["data.chance"] = parseInt(formData["data.chance"]);
    return super._updateObject(event, formData);
  }
}
