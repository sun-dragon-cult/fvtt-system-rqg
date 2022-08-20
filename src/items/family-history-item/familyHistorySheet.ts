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
      sheetSpecific: {
        // homelandsJoined: itemData.data.homelands.join(", "),
        // standardsOfLiving: Object.values(StandardOfLivingEnum),
        // skillsJoined: itemData.data.occupationalSkills
        //   .map((skill) => {
        //     const bonus = `${skill.bonus >= 0 ? "+" : "-"}${skill.bonus}%`;
        //     if (skill.incomeSkill) {
        //       return `<span class="incomeSkillText">${skill.skillRqidLink?.name} ${bonus}</span>`;
        //     } else {
        //       return `<span>${skill.skillRqidLink?.name} ${bonus}</span>`;
        //     }
        //   })
        //   .join(", "),
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }
}
//   protected _updateObject(event: Event, formData: any): Promise<any> {
//     //@ts-ignore id
//     if (event?.currentTarget?.id.startsWith("bonus-")) {
//       //@ts-ignore dataset
//       const targetRqid = event.currentTarget.dataset.skillRqid;
//       if (targetRqid) {
//         const occSkills = (this.item.data.data as FamilyHistoryDataSourceData).occupationalSkills;
//         for (const skill of occSkills) {
//           if (skill.skillRqidLink?.rqid === targetRqid) {
//             //@ts-ignore value
//             skill.bonus = Number(event.currentTarget.value);
//           }
//         }
//         if (this.item.isEmbedded) {
//           this.item.actor?.updateEmbeddedDocuments("Item", [
//             {
//               _id: this.item.id,
//               "data.occupationalSkills": occSkills,
//             },
//           ]);
//         } else {
//           this.item.update({
//             "data.occupationalSkills": occSkills,
//           });
//         }
//       }
//     }

//     //@ts-ignore name
//     if (event?.currentTarget?.id.startsWith("income-skill-")) {
//       //@ts-ignore dataset
//       const targetRqid = event.currentTarget.dataset.skillRqid;
//       if (targetRqid) {
//         const occSkills = (this.item.data.data as FamilyHistoryDataSourceData).occupationalSkills;
//         for (const skill of occSkills) {
//           if (skill.skillRqidLink?.rqid === targetRqid) {
//             //@ts-ignore checked
//             skill.incomeSkill = event.currentTarget?.checked;
//           }
//         }
//         if (this.item.isEmbedded) {
//           this.item.actor?.updateEmbeddedDocuments("Item", [
//             {
//               _id: this.item.id,
//               "data.occupationalSkills": occSkills,
//             },
//           ]);
//         } else {
//           this.item.update({
//             "data.occupationalSkills": occSkills,
//           });
//         }
//       }
//     }

//     const specializationFormatted = formData["data.specialization"]
//       ? ` (${formData["data.specialization"]})`
//       : "";
//     const newName = formData["data.occupation"] + specializationFormatted;
//     if (newName) {
//       // If there's nothing in the occupation or region, don't rename
//       formData["name"] = newName;
//     }
//     return super._updateObject(event, formData);
//   }

//   public activateListeners(html: JQuery): void {
//     super.activateListeners(html);
//     const form = this.form as HTMLFormElement;

//     form.addEventListener("drop", this._onDrop.bind(this));
//     form
//       .querySelector("#btn-edit-occupational-skills-" + this.item.id)
//       ?.addEventListener("click", () => {
//         this.toggleSkillEdit(false);
//       });
//   }

//   private toggleSkillEdit(forceEdit = false) {
//     const form = this.form as HTMLFormElement;
//     const displaySkills = form.querySelector(
//       "#occupational-skill-display-" + this.item.id
//     ) as HTMLElement;
//     const editSkills = form.querySelector(
//       "#occupational-skill-edit-" + this.item.id
//     ) as HTMLElement;
//     const btnEdit = form.querySelector(
//       "#btn-edit-occupational-skills-" + this.item.id
//     ) as HTMLElement;
//     if (displaySkills?.style.display === "block" || forceEdit) {
//       displaySkills.style.display = "none";
//       editSkills.style.display = "block";
//       btnEdit.style.color = "gray";
//     } else {
//       displaySkills.style.display = "block";
//       editSkills.style.display = "none";
//       btnEdit.style.color = "black";
//     }
//   }

//   protected async _onDrop(event: DragEvent): Promise<void> {
//     await super._onDrop(event);

//     const thisFamilyHistory = this.item.data.data as FamilyHistoryDataSourceData;

//     let droppedDocumentData;
//     try {
//       droppedDocumentData = JSON.parse(event.dataTransfer!.getData("text/plain"));
//     } catch (err) {
//       ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
//       return;
//     }

//     const targetPropertyName = getDomDataset(event, "target-drop-property");

//     const droppedDocument = await JournalEntry.fromDropData(droppedDocumentData);

//     if (droppedDocument) {
//       if (targetPropertyName === "occupationRqidLink") {
//         const specializationFormatted = thisFamilyHistory.specialization
//           ? ` (${thisFamilyHistory.specialization})`
//           : "";
//         // update the occupation portion of the occupation name
//         const updatedName = droppedDocument.name + specializationFormatted;
//         if (this.item.isEmbedded) {
//           await this.item.actor?.updateEmbeddedDocuments("Item", [
//             {
//               _id: this.item.id,
//               "data.occupation": droppedDocument.name,
//               name: updatedName,
//             },
//           ]);
//         } else {
//           await this.item.update({
//             "data.occupation": droppedDocument.name,
//             name: updatedName,
//           });
//         }
//       }
//     }

//     if (droppedDocumentData.type === "Item") {
//       const droppedItem = (await Item.fromDropData(droppedDocumentData)) as RqgItem;

//       if (droppedItem === undefined) {
//         return;
//       }

//       if (droppedItem.type === "homeland") {
//         // For this one we're just saving the name of the homeland, without the region
//         // to an array of strings.
//         const homelands = thisFamilyHistory.homelands;
//         const newHomeland = (droppedItem.data as HomelandDataSource).data.homeland;
//         if (!homelands.includes(newHomeland)) {
//           homelands.push(newHomeland);
//           if (this.item.isEmbedded) {
//             await this.item.actor?.updateEmbeddedDocuments("Item", [
//               {
//                 _id: this.item.id,
//                 "data.homelands": homelands,
//               },
//             ]);
//           } else {
//             await this.item.update({
//               "data.homelands": homelands,
//             });
//           }
//         }
//       }
//     }
//   }
// }

// function ensureJournal(droppedItemData: any, target: string): boolean {
//   if (droppedItemData.type !== "JournalEntry") {
//     ui.notifications?.warn(
//       localize("RQG.Item.Notification.CanOnlyDropJournalEntryOnThisTargetWarning", {
//         target: localize("RQG.Item.FamilyHistory." + target),
//       })
//     );
//     return false;
//   }
//   return true;
// }
