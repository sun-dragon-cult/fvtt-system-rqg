import { RqgActorSheet } from "../../actors/rqgActorSheet";
import {
  OccupationDataProperties,
  OccupationDataPropertiesData,
  OccupationDataSourceData,
  StandardOfLivingEnum,
} from "../../data-model/item-data/occupationData";
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
import { HomelandDataSource, HomelandDataSourceData } from "../../data-model/item-data/homelandData";
import { HomelandSheetData } from "../homeland-item/homelandSheet";

export interface OccupationSheetData extends RqgItemSheetData {
  isEmbedded: boolean; // There might be no reason to actually embed Occupation items!
  data: OccupationDataProperties;
  occupationData: OccupationDataPropertiesData;
  sheetSpecific: {};
}

export class OccupationSheet extends RqgItemSheet<
  ItemSheet.Options,
  OccupationSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Occupation],
      template: "systems/rqg/items/occupation-item/occupationSheet.hbs",
      width: 550,
      height: 650,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "occupation",
        },
      ],
    });
  }

  getData(): OccupationSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Occupation);

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      occupationData: itemData.data,
      sheetSpecific: {
        homelandsJoined: itemData.data.homelands.join(", "),
        standardsOfLiving: Object.values(StandardOfLivingEnum),
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const specializationFormatted = formData["data.specialization"] ? ` (${formData["data.specialization"]})` : "";
    const newName = formData["data.occupation"] + specializationFormatted;
    if (newName) {
      // If there's nothing in the occupation or region, don't rename
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

    const target = findDatasetValueInSelfOrAncestors(event.target as HTMLElement, "targetDropProperty");
    const occupationData = this.item.data.data as OccupationDataSourceData;

    if (droppedEntityData.type === "Item") {
      // You must drop skills to two different targets, income and occupationa
      // but you can drop cult or equipment to anywhere because we know where to put them.

      const droppedItem = (await Item.fromDropData(droppedEntityData)) as RqgItem;

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

      if (droppedItem.type === "homeland") {
        // For this one we're just saving the name of the homeland, without the region
        // to an array of strings.
        const homelands = occupationData.homelands;
        const newHomeland = (droppedItem.data as HomelandDataSource).data.homeland;
        if (!homelands.includes(newHomeland)) {
          homelands.push(newHomeland);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.homelands": homelands,
              },
            ]);
          } else {
            await this.item.update({
              "data.homelands": homelands,
            });
          }
        }
      }

      if (droppedItem.type === "cult") {
        const cults = occupationData.cultRqidLinks;
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

      const startingEquipemntTypes = ["armor", "gear", "weapon"];

      if (startingEquipemntTypes.includes(droppedItem.type)) {
        const equipment = occupationData.startingEquipmentRqidLinks;
        if (!equipment.map((e) => e.rqid).includes(rqid)) {
          equipment.push(newRqidLink);
          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.startingEquipmentRqidLinks": equipment,
              },
            ]);
          } else {
            await this.item.update({
              "data.startingEquipmentRqidLinks": equipment,
            });
          }
        }
      }

      if (droppedItem.type === "skill") {
        if (target === "incomeSkillRqidLinks") {
          const incomeSkills = occupationData.incomeSkillRqidLinks;
          if (!incomeSkills.map((s) => s.rqid).includes(rqid)) {
            incomeSkills.push(newRqidLink);
            if (this.item.isEmbedded) {
              await this.item.actor?.updateEmbeddedDocuments("Item", [
                {
                  _id: this.item.id,
                  "data.incomeSkillRqidLinks": incomeSkills,
                },
              ]);
            } else {
              await this.item.update({
                "data.incomeSkillRqidLinks": incomeSkills,
              });
            }
          }
        }
        
        if (target == "occupationalSkillRqidLinks") {
          const occupationalSkills = occupationData.occupationalSkillRqidLinks;
          if (!occupationalSkills.map((s) => s.rqid).includes(rqid)) {
            occupationalSkills.push(newRqidLink);
            if (this.item.isEmbedded) {
              await this.item.actor?.updateEmbeddedDocuments("Item", [
                {
                  _id: this.item.id,
                  "data.occupationalSkillRqidLinks": occupationalSkills,
                },
              ]);
            } else {
              await this.item.update({
                "data.occupationalSkillRqidLinks": occupationalSkills,
              });
            }
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

    if (target) {

      if (target === "occupationJournalLink") {
        if (!ensureJournal(droppedEntityData, target)) {
          return;
        }
        const specializationFormatted = occupationData.specialization
          ? ` (${occupationData.specialization})`
          : "";
        // update the occupation portion of the occupation name
        const updatedName = newLink.journalName + specializationFormatted;
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.occupationJournalLink": newLink,
              "data.occupation": newLink.journalName,
              name: updatedName,
            },
          ]);
        } else {
          await this.item.update({
            "data.occupationJournalLink": newLink,
            "data.occupation": newLink.journalName,
            name: updatedName,
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
        target: localize("RQG.Item.Occupation." + target),
      })
    );
    return false;
  }
  return true;
}
