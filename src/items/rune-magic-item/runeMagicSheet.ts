import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  RuneMagicDataProperties,
  RuneMagicDataPropertiesData,
} from "../../data-model/item-data/runeMagicData";

import { RqgActorSheet } from "../../actors/rqgActorSheet";
import {
  assertItemType,
  getAllRunesIndex,
  getDomDataset,
  getGameUser,
  getJournalEntryName,
  getRequiredDomDataset,
} from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { SpellDurationEnum, SpellRangeEnum } from "../../data-model/item-data/spell";
import { droppableJournalDescription } from "../isDroppable";

interface RuneMagicSheetData extends RqgItemSheetData {
  isEmbedded: boolean;
  data: RuneMagicDataProperties; // Actually contains more...complete with effects, flags etc
  runeMagicData: RuneMagicDataPropertiesData;
  sheetSpecific: {
    ranges: SpellRangeEnum[];
    durations: SpellDurationEnum[];
    actorCults: any[];
    allRunes: IndexTypeForMetadata<CompendiumCollection.Metadata>;
    journalEntryName: string | undefined;
  };
}

export class RuneMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  RuneMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.RuneMagic],
      template: "systems/rqg/items/rune-magic-item/runeMagicSheet.hbs",
      width: 450,
      height: 500,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "rune-magic" }],
    });
  }

  getData(): RuneMagicSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.RuneMagic);

    const runeMagicData = itemData.data;
    runeMagicData.runes = Array.isArray(runeMagicData.runes)
      ? runeMagicData.runes
      : [runeMagicData.runes];

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      runeMagicData: itemData.data,
      sheetSpecific: {
        ranges: Object.values(SpellRangeEnum),
        durations: Object.values(SpellDurationEnum),
        actorCults: this.getActorCults(),
        allRunes: getAllRunesIndex(),
        journalEntryName: getJournalEntryName(runeMagicData),
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  private getActorCults(): any[] {
    return this.actor
      ? this.actor.getEmbeddedCollection("Item").filter((i) => i.data.type === ItemTypeEnum.Cult)
      : [];
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: string) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    this.form?.addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    this.form?.querySelectorAll("[data-journal-id]").forEach((el) => {
      const elem = el as HTMLElement;
      const pack = getDomDataset($(elem), "journal-pack");
      const id = getRequiredDomDataset($(elem), "journal-id");
      elem.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    await droppableJournalDescription(this.item, event);
  }
}
