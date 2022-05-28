import { RqgActorSheet } from "../../actors/rqgActorSheet";
import {
  HomelandDataProperties,
  HomelandDataPropertiesData,
  HomelandDataSourceData,
} from "../../data-model/item-data/homelandData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  assertItemType,
  findDatasetValueInSelfOrAncestors,
  getDomDataset,
  getGameUser,
  getJournalEntryNameByJournalEntryLink,
  getRequiredDomDataset,
  localize,
} from "../../system/util";
import { RqgItemSheet, RqgItemSheetData, RqidLinkDragEvent } from "../RqgItemSheet";

export interface HomelandSheetData extends RqgItemSheetData {
  isEmbedded: boolean; // There might be no reason to actually embed Homeland items!
  data: HomelandDataProperties;
  homelandData: HomelandDataPropertiesData;
  sheetSpecific: {};
}

export class HomelandSheet extends RqgItemSheet<
  ItemSheet.Options,
  HomelandSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Homeland],
      template: "systems/rqg/items/homeland-item/homelandSheet.hbs",
      width: 550,
      height: 850,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "homeland",
        },
      ],
    });
  }

  getData(): HomelandSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Homeland);

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      homelandData: itemData.data,
      sheetSpecific: {},
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const region = formData["data.region"] ? ` (${formData["data.region"]})` : "";
    const newName = formData["data.homeland"] + region;
    if (newName) {
      // If there's nothing in the homeland or region, don't rename
      formData["name"] = newName;
    }
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

    form.addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    form.querySelectorAll("[data-journal-id]").forEach((element) => {
      const el = element as HTMLElement;
      const pack = getDomDataset($(el), "journal-pack");
      const id = getRequiredDomDataset($(el), "journal-id");
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);

    let droppedDocumentData;
    try {
      droppedDocumentData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
      return;
    }

    const targetPropertyName = findDatasetValueInSelfOrAncestors(
      event.target as HTMLElement,
      "targetDropProperty"
    );

    const droppedDocument = await JournalEntry.fromDropData(droppedDocumentData);

    if (droppedDocument) {
      const thisHomeland = this.item.data.data as HomelandDataSourceData;

      if (targetPropertyName === "homelandJournalRqidLink") {
        const regionNameFormatted = thisHomeland.region ? ` (${thisHomeland.region})` : "";
        // update the homeland portion of the homeland name
        const updatedName = droppedDocument.name + regionNameFormatted;
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.homeland": droppedDocument.name,
              name: updatedName,
            },
          ]);
        } else {
          await this.item.update({
            "data.homeland": droppedDocument.name,
            name: updatedName,
          });
        }
      }

      if (targetPropertyName === "regionJournalRqidLink") {
        // update the region portion of the homeland name
              const regionNameFormatted = droppedDocument.name ? ` (${droppedDocument.name})` : "";
              const updatedName =thisHomeland.homeland + regionNameFormatted;
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.region": droppedDocument.name,
              name: updatedName,
            },
          ]);
        } else {
          await this.item.update({
            "data.region": droppedDocument.name,
            name: updatedName,
          });
        }
      }
    }
  }
}

function ensureJournal(droppedItemData: any, target: string): boolean {
  if (droppedItemData.type !== "JournalEntry") {
    ui.notifications?.warn(
      localize("RQG.Item.Notification.CanOnlyDropJournalEntryOnThisTargetWarning", {
        target: localize("RQG.Item.Homeland." + target),
      })
    );
    return false;
  }
  return true;
}
