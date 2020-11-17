import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

import { RqgItemSheet } from "../RqgItemSheet";
import { RuneMagicData } from "../../data-model/item-data/runeMagicData";
import { CultData } from "../../data-model/item-data/cultData";
import { RuneData, RuneEnum } from "../../data-model/item-data/runeData";

export class RuneMagicSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.RuneMagic],
      template: "systems/rqg/items/rune-magic-item/runeMagicSheet.html",
      width: 520,
      height: 250,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: RuneMagicData = sheetData.item.data;
    if (this.actor) {
      data.cultIds = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter((i: ItemData<CultData>) => i.type === ItemTypeEnum.Cult);
      if (data.cultIds.length === 1) {
        data.cultId = data.cultIds[0];
      }
    }
    data.runes = Array.isArray(data.runes) ? data.runes : [data.runes];

    const runeChances = this.actor
      .getEmbeddedCollection("OwnedItem")
      .filter(
        (i: ItemData<RuneData>) =>
          i.type === ItemTypeEnum.Rune &&
          (data.runes.includes(RuneEnum.Magic) ||
            data.runes.includes(i.name as RuneEnum))
      )
      .map((r: ItemData<RuneData>) => r.data.chance);
    data.chance = Math.max(...runeChances);

    data.allRunes = Object.values(RuneEnum).concat("" as RuneEnum);

    return sheetData;
  }

  protected _updateObject(
    event: Event | JQuery.Event,
    formData: any
  ): Promise<any> {
    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r) => r); // Remove empty
    formData["data.chance"] = parseInt(formData["data.chance"]);

    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }
}
