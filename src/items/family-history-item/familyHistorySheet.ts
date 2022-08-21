import {
  FamilyHistoryDataProperties,
  FamilyHistoryDataPropertiesData,
  FamilyHistoryDataSourceData,
} from "../../data-model/item-data/familyHistoryData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, getDomDataset, getGameUser, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { HomelandDataSource } from "../../data-model/item-data/homelandData";
import { systemId } from "../../system/config";
import { documentRqidFlags } from "src/data-model/shared/rqgDocumentFlags";
import { RqidLink } from "src/data-model/shared/rqidLink";

export interface FamilyHistorySheetData extends RqgItemSheetData {
  isEmbedded: boolean; // There might be no reason to actually embed FamilyHistory items!
  data: FamilyHistoryDataProperties;
  familyHistoryData: FamilyHistoryDataPropertiesData;
  sheetSpecific: {};
}

export class FamilyHistorySheet extends RqgItemSheet<
  ItemSheet.Options,
  FamilyHistorySheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ItemTypeEnum.FamilyHistory],
      template: "systems/rqg/items/family-history-item/familyHistorySheet.hbs",
      width: 550,
      height: 650,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "family-history",
        },
      ],
    });
  }

  getData(): FamilyHistorySheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.FamilyHistory);

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      familyHistoryData: itemData.data,
      sheetSpecific: {},
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("begin-year-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;
      console.log("Family History Entry Index", targetIndex);

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].beginYear = Number(event.currentTarget.value);
        entries.sort((a,b) => ((a.beginYear || 0) > (b.beginYear || 0)) ? 1 : -1);
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.familyHistoryEntries": entries,
            },
          ]);
        } else {
          await this.item.update({
            "data.familyHistoryEntries": entries,
          });
        }
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("end-year-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;
      console.log("Family History Entry Index", targetIndex);

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].endYear = Number(event.currentTarget.value);
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.familyHistoryEntries": entries,
            },
          ]);
        } else {
          await this.item.update({
            "data.familyHistoryEntries": entries,
          });
        }
      }
    }

    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

    form.addEventListener("drop", this._onDrop.bind(this));
  }

  protected async _onDrop(event: DragEvent): Promise<void> {

    const thisFamilyHistory = this.item.data.data as FamilyHistoryDataSourceData;

    let droppedDocumentData;
    try {
      droppedDocumentData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
      return;
    }

    const targetPropertyName = getDomDataset(event, "target-drop-property");

    const droppedDocument = await JournalEntry.fromDropData(droppedDocumentData);

    if (droppedDocumentData.type === "RollTable") {
      const droppedItem = (await RollTable.fromDropData(droppedDocumentData)) as RqgItem;

      if (droppedItem === undefined) {
        return;
      }

      const rollTableRqid = droppedItem.data.flags.rqg?.documentRqidFlags?.id;

      if (!rollTableRqid) {
        return;
      }

      const rqidLink: RqidLink = {rqid: rollTableRqid, name: droppedItem.name || "", documentType: droppedItem.type, bonus: 0};

      const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;

      entries.push({beginYear: 0, endYear: 0, ancestor: "grandparent", rollTableRqidLink: rqidLink, modifiers: ""});
      entries.sort((a, b) => ((a.beginYear || 0) > (b.beginYear || 0) ? 1 : -1));

      if (this.item.isEmbedded) {
        await this.item.actor?.updateEmbeddedDocuments("Item", [
          {
            _id: this.item.id,
            "data.familyHistoryEntries": entries,
          },
        ]);
      } else {
        await this.item.update({
          "data.familyHistoryEntries": entries,
        });
      }

      return;
    }
    await super._onDrop(event);
  }
}
