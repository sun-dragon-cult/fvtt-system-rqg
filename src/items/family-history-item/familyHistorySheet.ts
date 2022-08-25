import {
  FamilyHistoryDataProperties,
  FamilyHistoryDataPropertiesData,
  FamilyHistoryDataSourceData,
  FamilyHistoryEntry,
} from "../../data-model/item-data/familyHistoryData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, getDomDataset, getGameUser, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { systemId } from "../../system/config";
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
      width: 650,
      height: 850,
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
      sheetSpecific: {
        targetCharacterTypes: ["pick", "grandparent", "parent", "self"],
      },
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
        // Most of the time the two years will be the same, so set the end year to the begin year if not already set
        if (entries[targetIndex].endYear === undefined) {
          entries[targetIndex].endYear = entries[targetIndex].beginYear;
        }
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
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("end-year-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].endYear = Number(event.currentTarget.value);
        await this.updateEntries(entries);
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("target-character-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].targetCharacter = event.currentTarget.value;
        await this.updateEntries(entries);
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("year-text-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].yearText = event.currentTarget.value;
        await this.updateEntries(entries);
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("events-text-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].eventsText = event.currentTarget.value;
        await this.updateEntries(entries);
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("year-dice-expression-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].yearDiceExpression = event.currentTarget.value;
        await this.updateEntries(entries);
      }
    }

    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("year-modifiers-")) {
      //@ts-ignore dataset
      const targetIndex = event.currentTarget.dataset.index;

      if (targetIndex) {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        //@ts-ignore value
        entries[targetIndex].modifiers = event.currentTarget.value;
        await this.updateEntries(entries);
      }
    }

    return super._updateObject(event, formData);
  }

  private async updateEntries(entries: FamilyHistoryEntry[]) {
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

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

    form.addEventListener("drop", this._onDrop.bind(this));

    html.find("[data-delete-index]").each((i: number, el: HTMLElement) => {
      const deleteIndex = Number(getDomDataset(el, "delete-index"));
      el.addEventListener("click", async () => {
        const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;
        entries.splice(deleteIndex, 1);
        await this.updateEntries(entries);
      });
    });
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
        const msg = localize("RQG.Item.Notification.RollTableNoRqid", {rollTableName: droppedItem.name});
        console.log(msg);
        ui.notifications?.warn(msg);
        return;
      }

      const rqidLink: RqidLink = {
        rqid: rollTableRqid,
        name: droppedItem.name || "",
        documentType: droppedItem.type,
        bonus: 0,
      };

      const entries = (this.item.data.data as FamilyHistoryDataSourceData).familyHistoryEntries;

      entries.push({
        beginYear: undefined,
        endYear: undefined,
        targetCharacter: "grandparent",
        rollTableRqidLink: rqidLink,
        modifiers: "",
        eventsText: "",
        yearText: localize("RQG.Item.FamilyHistory.Year"),
        yearDiceExpression: "1d20",
        yearResult: ""
      });
      entries.sort((a, b) => ((a.beginYear || 0) > (b.beginYear || 0) ? 1 : -1));

      await this.updateEntries(entries);

      return;
    }
    await super._onDrop(event);
  }
}
