import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  SpiritMagicDataProperties,
  SpiritMagicDataPropertiesData,
} from "../../data-model/item-data/spiritMagicData";
import { assertItemType, getGameUser, getJournalEntryName } from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import {
  SpellConcentrationEnum,
  SpellDurationEnum,
  SpellRangeEnum,
} from "../../data-model/item-data/spell";
import { systemId } from "../../system/config";

interface SpiritMagicSheetData extends RqgItemSheetData {
  isEmbedded: boolean;
  data: SpiritMagicDataProperties; // Actually contains more...complete with effects, flags etc
  spiritMagicData: SpiritMagicDataPropertiesData;
  sheetSpecific: {
    ranges: SpellRangeEnum[];
    durations: SpellDurationEnum[];
    types: SpellConcentrationEnum[];
    journalEntryName: string;
  };
}

export class SpiritMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  SpiritMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ItemTypeEnum.SpiritMagic],
      template: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.hbs",
      width: 450,
      height: 450,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "spirit-magic",
        },
      ],
    });
  }

  getData(): SpiritMagicSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.SpiritMagic);

    const spiritMagicData = itemData.data;
    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      spiritMagicData: itemData.data,
      sheetSpecific: {
        ranges: Object.values(SpellRangeEnum),
        durations: Object.values(SpellDurationEnum),
        types: Object.values(SpellConcentrationEnum),
        journalEntryName: getJournalEntryName(spiritMagicData),
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    await super._onDrop(event);
  }
}
