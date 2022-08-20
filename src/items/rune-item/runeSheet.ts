import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  RuneDataProperties,
  RuneDataPropertiesData,
  RuneTypeEnum,
} from "../../data-model/item-data/runeData";
import {
  assertItemType,
  getAvailableRunes,
  getGameUser,
  AvailableRuneCache,
} from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";

interface RuneSheetData extends RqgItemSheetData {
  isEmbedded: boolean;
  data: RuneDataProperties; // Actually contains more...complete with effects, flags etc
  runeData: RuneDataPropertiesData;
  sheetSpecific: {
    allRunes: AvailableRuneCache[];
    runeTypes: RuneTypeEnum[];
    journalEntryName: string;
  };
}

export class RuneSheet extends RqgItemSheet<ItemSheet.Options, RuneSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ItemTypeEnum.Rune],
      template: "systems/rqg/items/rune-item/runeSheet.hbs",
      width: 450,
      height: 400,
      tabs: [
        { navSelector: ".item-sheet-nav-tabs", contentSelector: ".sheet-body", initial: "rune" },
      ],
    });
  }

  getData(): RuneSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Rune);

    const runeData = itemData.data;
    if (!runeData.rune) {
      runeData.rune = itemData.name;
    }

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      runeData: itemData.data,
      sheetSpecific: {
        allRunes: getAvailableRunes(),
        runeTypes: Object.values(RuneTypeEnum),
        journalEntryName: runeData.descriptionRqidLink.name,
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    formData["name"] = `${formData["data.rune"]} (${formData["data.runeType"]})`;

    let minorRunes = formData["data.minorRunes"];
    minorRunes = Array.isArray(minorRunes) ? minorRunes : [minorRunes];
    minorRunes = [...new Set(minorRunes.filter((r: any) => r))]; // Remove empty & duplicates
    formData["data.minorRunes"] = duplicate(minorRunes);

    formData["data.chance"] = Number(formData["data.chance"]);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

    form.addEventListener("drop", this._onDrop.bind(this));
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    return super._onDrop(event);
  }
}
