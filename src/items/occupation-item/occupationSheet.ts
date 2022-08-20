import {
  OccupationalSkill,
  OccupationDataProperties,
  OccupationDataPropertiesData,
  OccupationDataSourceData,
  StandardOfLivingEnum,
} from "../../data-model/item-data/occupationData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, getDomDataset, getGameUser, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import { HomelandDataSource } from "../../data-model/item-data/homelandData";
import { systemId } from "../../system/config";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqidLink } from "../../data-model/shared/rqidLink";

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
      classes: [systemId, "sheet", ItemTypeEnum.Occupation],
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
        skillsJoined: itemData.data.occupationalSkills
          .map((skill) => {
            const bonus = `${skill.bonus >= 0 ? "+" : "-"}${skill.bonus}%`;
            if (skill.incomeSkill) {
              return `<span class="incomeSkillText">${skill.skillRqidLink?.name} ${bonus}</span>`;
            } else {
              return `<span>${skill.skillRqidLink?.name} ${bonus}</span>`;
            }
          })
          .join(", "),
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    //@ts-ignore id
    if (event?.currentTarget?.id.startsWith("bonus-")) {
      //@ts-ignore dataset
      const targetRqid = event.currentTarget.dataset.skillRqid;
      if (targetRqid) {
        const occSkills = (this.item.data.data as OccupationDataSourceData).occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            //@ts-ignore value
            skill.bonus = Number(event.currentTarget.value);
          }
        }
        if (this.item.isEmbedded) {
          this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.occupationalSkills": occSkills,
            },
          ]);
        } else {
          this.item.update({
            "data.occupationalSkills": occSkills,
          });
        }
      }
    }

    //@ts-ignore name
    if (event?.currentTarget?.id.startsWith("income-skill-")) {
      //@ts-ignore dataset
      const targetRqid = event.currentTarget.dataset.skillRqid;
      if (targetRqid) {
        const occSkills = (this.item.data.data as OccupationDataSourceData).occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            //@ts-ignore checked
            skill.incomeSkill = event.currentTarget?.checked;
          }
        }
        if (this.item.isEmbedded) {
          this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "data.occupationalSkills": occSkills,
            },
          ]);
        } else {
          this.item.update({
            "data.occupationalSkills": occSkills,
          });
        }
      }
    }

    const specializationFormatted = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
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
    form
      .querySelector("#btn-edit-occupational-skills-" + this.item.id)
      ?.addEventListener("click", () => {
        this.toggleSkillEdit(false);
      });

    $(this.form!)
      .find("[data-delete-occupational-skill-rqid]")
      .each((i: number, el: HTMLElement) => {
        el.addEventListener("click", async (ev: MouseEvent) => {
          // Note that if there are duplicate skills, like "Craft (...)",
          // deleting one of them will delete all of them.
          let rqidToDelete = getDomDataset(ev, "delete-occupational-skill-rqid");
          const thisOccupation = this.item.data.data as OccupationDataSourceData;
          const occSkills = thisOccupation.occupationalSkills.filter(function (skill) {return skill.skillRqidLink?.rqid !== rqidToDelete});

          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.occupationalSkills": occSkills,
              },
            ]);
          } else {
            await this.item.update({
              "data.occupationalSkills": occSkills,
            });
          }

        });
    });
  }

  private toggleSkillEdit(forceEdit = false) {
    const form = this.form as HTMLFormElement;
    const displaySkills = form.querySelector(
      "#occupational-skill-display-" + this.item.id
    ) as HTMLElement;
    const editSkills = form.querySelector(
      "#occupational-skill-edit-" + this.item.id
    ) as HTMLElement;
    const btnEdit = form.querySelector(
      "#btn-edit-occupational-skills-" + this.item.id
    ) as HTMLElement;
    if (displaySkills?.style.display === "block" || forceEdit) {
      displaySkills.style.display = "none";
      editSkills.style.display = "block";
      btnEdit.style.color = "gray";
    } else {
      displaySkills.style.display = "block";
      editSkills.style.display = "none";
      btnEdit.style.color = "black";
    }
  }

  protected async _onDrop(event: DragEvent): Promise<void> {

    const thisOccupation = this.item.data.data as OccupationDataSourceData;

    let droppedDocumentData;
    try {
      droppedDocumentData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
      return;
    }

    if (droppedDocumentData.type === "Item") {
      const droppedItem = (await Item.fromDropData(droppedDocumentData)) as RqgItem;

      if (droppedItem === undefined) {
        return;
      }

      // Homelands require special handling here (rather than in RqgItemSheet) becase
      // we are just storing the name of the homeland in an array.
      if (droppedItem.type === ItemTypeEnum.Homeland) {
        // For this one we're just saving the name of the homeland, without the region
        // to an array of strings.
        const homelands = thisOccupation.homelands;
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
        return;
      }

      // Skills require special handling here (rather than in RqgItemSheet) because 
      // we will associate the skill with a bonus
      if (droppedItem.type === ItemTypeEnum.Skill) {
        let droppedRqid = droppedItem.getFlag(systemId, documentRqidFlags);

        if (droppedRqid && droppedRqid.id) {
          console.log(droppedRqid);

          let occSkill = new OccupationalSkill();
          occSkill.bonus = 0;
          occSkill.incomeSkill = false;
          occSkill.skillRqidLink = new RqidLink();
          occSkill.skillRqidLink.name = droppedItem.name || "";
          occSkill.skillRqidLink.rqid = droppedRqid?.id;

          let occSkills = thisOccupation.occupationalSkills;

          // this is intentionally NOT checking for duplicate skills
          // since an Occupation might have generic skills more than once,
          // for example Craft(...)
          occSkills.push(occSkill);

          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "data.occupationalSkills": occSkills,
              },
            ]);
          } else {
            await this.item.update({
              "data.occupationalSkills": occSkills,
            });
          }
        } else {
          // see #315 and this situation should be handled however we decide
          // to generally handle dropping things that do not have rqids
          console.log("Dropped skill did not have an Rqid");
        }
        // Return now so we don't handle his at the RqgItemSheet._onDrop
        return;
      }
    }

    await super._onDrop(event);

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
