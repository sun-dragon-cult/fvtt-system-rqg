import { RqgActorSheet } from "../../actors/rqgActorSheet";
import {
  HomelandDataProperties,
  HomelandDataPropertiesData,
  HomelandDataSourceData,
} from "../../data-model/item-data/homelandData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { JournalEntryLink } from "../../data-model/shared/journalentrylink";
import { RqidLink } from "../../data-model/shared/rqidLink";
import {
  assertItemType,
  findDatasetValueInSelfOrAncestors,
  getDomDataset,
  getGameUser,
  getJournalEntryNameByJournalEntryLink,
  getRequiredDomDataset,
  localize,
} from "../../system/util";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";

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
      height: 650,
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

    let droppedEntityData;
    try {
      droppedEntityData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
      return;
    }

    const homelandData = this.item.data.data as HomelandDataSourceData;

    if (droppedEntityData.type === "Item") {
      // You can drop items anywhere on this form because we know what they are
      // and where to put them.
      const droppedItem = (await Item.fromDropData(droppedEntityData)) as RqgItem;

      console.log("DROPPED ITEM: ", droppedItem);

      if (droppedItem === undefined) {
        return;
      }

      if (!droppedItem.data.data.rqid) {
        ui.notifications?.warn(localize("RQG.Item.Notification.MustHaveRqidToDrop"));
        return;
      }

      const rqid = droppedItem.data.data.rqid;

      const newRqidLink = new RqidLink();
      newRqidLink.rqid = rqid;
      newRqidLink.itemType = droppedItem.type;
      newRqidLink.name = droppedItem.name || "";

      if (droppedItem.type === "cult") {
        const cults = homelandData.cultRqidLinks;
        if (!cults.map((c) => c.rqid).includes(rqid)) {
          cults.push(newRqidLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.cultRqidLinks": cults,
              },
            ]);
          } else {
            await this.item.update({
              "data.cultRqidLinks": cults,
            });
          }
        }
      }

      if (droppedItem.type === "passion") {
        const passions = homelandData.passionRqidLinks;
        if (!passions.map((p) => p.rqid).includes(rqid)) {
          passions.push(newRqidLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.passionRqidLinks": passions,
              },
            ]);
          } else {
            await this.item.update({
              "data.passionRqidLinks": passions,
            });
          }
        }
      }

      if (droppedItem.type === "rune") {
        const runes = homelandData.runeRqidLinks;
        if (!runes.map((r) => r.rqid).includes(rqid)) {
          runes.push(newRqidLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.runeRqidLinks": runes,
              },
            ]);
          } else {
            await this.item.update({
              "data.runeRqidLinks": runes,
            });
          }
        }
      }

      return;
    }

    const pack = droppedEntityData.pack ? droppedEntityData.pack : "";
    const newLink = new JournalEntryLink();
    newLink.journalId = droppedEntityData.id;
    newLink.journalPack = pack;
    newLink.journalName = getJournalEntryNameByJournalEntryLink(newLink);

    const target = findDatasetValueInSelfOrAncestors(event.target as HTMLElement, "journalTarget");
    if (target) {

      if (target === "homelandJournalLink") {
        if (!ensureJournal(droppedEntityData, target)) {
          return;
        }
        const regionNameFormatted = homelandData.region ? ` (${homelandData.region})` : "";
        // update the homeland portion of the homeland name
        const updatedName = newLink.journalName + regionNameFormatted;
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.homelandJournalLink": newLink,
              "data.homeland": newLink.journalName,
              name: updatedName,
            },
          ]);
        } else {
          await this.item.update({
            "data.homelandJournalLink": newLink,
            "data.homeland": newLink.journalName,
            name: updatedName,
          });
        }
      }

      if (target === "regionJournalLink") {
        if (!ensureJournal(droppedEntityData, target)) {
          return;
        }
        // update the region portion of the Homeland name
        const regionNameFormatted = newLink.journalName ? ` (${newLink.journalName})` : "";
        const updatedName = homelandData.homeland + regionNameFormatted;
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.regionJournalLink": newLink,
              "data.region": newLink.journalName,
              name: updatedName,
            },
          ]);
        } else {
          await this.item.update({
            "data.regionJournalLink": newLink,
            "data.region": newLink.journalName,
            name: updatedName,
          });
        }
      }

      if (target === "cultureJournalLinks") {
        if (!ensureJournal(droppedEntityData, target)) {
          return;
        }
        const cultureLinks = (this.item.data.data as HomelandDataSourceData).cultureJournalLinks;
        if (!cultureLinks.map((j) => j.journalId).includes(newLink.journalId)) {
          cultureLinks.push(newLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.cultureJournalLinks": cultureLinks,
              },
            ]);
          } else {
            await this.item.update({
              "data.cultureJournalLinks": cultureLinks,
            });
          }
        }
      }

      if (target === "tribeJournalLinks") {
        if (!ensureJournal(droppedEntityData, target)) {
          return;
        }
        const tribeLinks = (this.item.data.data as HomelandDataSourceData).tribeJournalLinks;
        if (!tribeLinks.map((j) => j.journalId).includes(newLink.journalId)) {
          tribeLinks.push(newLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.tribeJournalLinks": tribeLinks,
              },
            ]);
          } else {
            await this.item.update({
              "data.tribeJournalLinks": tribeLinks,
            });
          }
        }
      }

      if (target === "clanJournalLinks") {
        if (!ensureJournal(droppedEntityData, target)) {
          return;
        }
        const clanLinks = (this.item.data.data as HomelandDataSourceData).clanJournalLinks;
        if (!clanLinks.map((j) => j.journalId).includes(newLink.journalId)) {
          clanLinks.push(newLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.clanJournalLinks": clanLinks,
              },
            ]);
          } else {
            await this.item.update({
              "data.clanJournalLinks": clanLinks,
            });
          }
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
