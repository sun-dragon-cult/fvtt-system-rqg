import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { HomelandDataProperties, HomelandDataPropertiesData, HomelandDataSourceData } from "../../data-model/item-data/homelandData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { JournalEntryLink } from "../../data-model/shared/journalentrylink";
import { assertItemType, getDomDataset, getGame, getGameUser, getJournalEntryName, getJournalEntryNameByJournalEntryLink, getRequiredDomDataset, localize, localizeItemType } from "../../system/util";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";


export interface HomelandSheetData extends RqgItemSheetData {
    isEmbedded: boolean;  // There might be no reason to actually embed Homeland items!
    data: HomelandDataProperties;
    homelandData: HomelandDataPropertiesData;
    sheetSpecific: {}
}

export class HomelandSheet extends RqgItemSheet<ItemSheet.Options, HomelandSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Homeland],
      template: "systems/rqg/items/homeland-item/homelandSheet.hbs",
      width: 450,
      height: 500,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "homeland" }],
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
      sheetSpecific: {
        cultureNamesFormatted: itemData.data.cultures.join(", "),
      },
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
      formData["name"] = formData["data.homeland"] + region;
    }
    return super._updateObject(event, formData);
  }

  // TODO: I copy pasted this exactly from runeSheet.ts.  Should it be abstracted?
  // TODO: Why is showJournalEntry on RqgActorSheet?
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
    console.log("DROP:", event);

    // TODO: a lot of this is copied form isDroppabpe.droppableJournalDescription with slight modification.  Abstract?

      let droppedEntityData;
      try {
        droppedEntityData = JSON.parse(event.dataTransfer!.getData("text/plain"));
      } catch (err) {
        ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
        return;
      }

      const pack = droppedEntityData.pack ? droppedEntityData.pack : "";

      // TODO: see if any of the ancestors of the event.target have the journalTarget
      // in case the user dragged something onto whatever might be already inside the journalTarget
      const target = (event.target as HTMLElement).dataset.journalTarget;

      console.log("TARGET: " + target);

      console.log("DROPPED ENTITY: " , droppedEntityData);

      if (droppedEntityData.type === "Item") {
        // You can drop items anywhere on this form
        const droppedItem = getGame().items?.get(droppedEntityData.id);

        console.log("DROPPED ITEM: ", droppedItem);
        return;
      }

      const newLink = new JournalEntryLink;
      newLink.journalId = droppedEntityData.id;
      newLink.journalPack = pack;
      newLink.journalName = getJournalEntryNameByJournalEntryLink(newLink);

      if (target) {
        
        // NOTE: I tried to use interpolated strings to like `data.${target}.journalid` but that doesn't appear
        // to work for property names

        if (target === "homelandJournalLink") {
          if (!ensureJournal(droppedEntityData, target)) {
            return
          }
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.homelandJournalLink": newLink,
                "data.homeland": newLink.journalName,
              },
            ]);
          } else {
            await this.item.update({
              "data.homelandJournalLink": newLink,
              "data.homeland": newLink.journalName,
            });
          }          
        }

        if (target === "regionJournalLink") {
          if (!ensureJournal(droppedEntityData, target)) {
            return;
          }
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.regionJournalLink": newLink,
                "data.region": newLink.journalName,
              },
            ]);
          } else {
            await this.item.update({
              "data.regionJournalLink": newLink,
              "data.region": newLink.journalName,
            });
          }
        }

        if (target === "cultureJournalLinks") {
          if (!ensureJournal(droppedEntityData, target)) {
            return;
          }
          const cultureLinks = (this.item.data.data as HomelandDataSourceData).cultureJournalLinks;
          cultureLinks.push(newLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.cultureJournalLinks": cultureLinks,
                "data.cultures": cultureLinks.map(c => c.journalName),
              },
            ]);
          } else {
            await this.item.update({
              "data.cultureJournalLinks": cultureLinks,
              "data.cultures": cultureLinks.map((c) => c.journalName),
            });
          }
        }

      } else {
        ui.notifications?.warn(localize("RQG.Item.Notification.PleaseDropOnTarget"));
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
