import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RuneTypeEnum } from "../../data-model/item-data/runeData";
import { getAvailableRunes, getGameUser, AvailableRuneCache, localize } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";

interface RuneSheetData {
  allRunes: AvailableRuneCache[];
  runeTypes: string[];
  rqid: string;
}
export class RuneSheet extends RqgItemSheet<ItemSheet.Options, RuneSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Rune],
      template: "systems/rqg/items/rune-item/runeSheet.hbs",
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "rune",
        },
      ],
    });
  }

  getData(): RuneSheetData & ItemSheetData {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = duplicate(this.document._source.system);

    if (!system.rune) {
      system.rune = this.document.name;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: getGameUser().isGM,
      system: system,
      isEmbedded: this.document.isEmbedded,
      allRunes: getAvailableRunes(),
      runeTypes: Object.values(RuneTypeEnum).map((rt) => localize("RQG.Item.Rune.RuneType." + rt)),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    formData["name"] = `${formData["system.rune"]} (${formData["system.runeType"]})`;
    formData["system.chance"] = Number(formData["system.chance"]);
    return super._updateObject(event, formData);
  }
}
