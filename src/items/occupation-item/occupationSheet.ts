import {
  OccupationalSkill,
  type OccupationDataSourceData,
  StandardOfLivingEnum,
} from "../../data-model/item-data/occupationData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertHtmlElement, getDomDataset, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqidLink } from "../../data-model/shared/rqidLink";
import type { DocumentSheetData } from "../shared/sheetInterfaces";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

export interface OccupationSheetData {
  homelandsJoined: string;
  standardsOfLivingOptions: SelectOptionData<StandardOfLivingEnum>[];
  skillsJoined: string;
}

export class OccupationSheet extends RqgItemSheet<
  ItemSheet.Options,
  OccupationSheetData | ItemSheet.Data
> {
  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Occupation],
      template: templatePaths.itemOccupationSheet,
      width: 600,
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

  override getData(): OccupationSheetData & DocumentSheetData {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: game.user?.isGM ?? false,
      system: system,

      homelandsJoined: system.homelands.join(", "),
      standardsOfLivingOptions: Object.values(StandardOfLivingEnum).map((standard) => ({
        value: standard,
        label: localize("RQG.Item.Occupation.StandardOfLivingEnum." + standard),
      })),
      skillsJoined: system.occupationalSkills
        .map((skill: any) => {
          const bonus = `${skill.bonus >= 0 ? "+" : "-"}${skill.bonus}%`;
          if (skill.incomeSkill) {
            return `<span class="incomeSkillText">${skill.skillRqidLink?.name} ${bonus}</span>`;
          } else {
            return `<span>${skill.skillRqidLink?.name} ${bonus}</span>`;
          }
        })
        .join(", "),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    // @ts-expect-error currentTarget.id
    if (event?.currentTarget?.id.startsWith("bonus-")) {
      //@ts-expect-error dataset
      const targetRqid = event.currentTarget.dataset.skillRqid;
      if (targetRqid) {
        const occSkills = (this.item.system as OccupationDataSourceData).occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            //@ts-expect-error value
            skill.bonus = Number(event.currentTarget.value);
          }
        }
        if (this.item.isEmbedded) {
          this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "system.occupationalSkills": occSkills,
            },
          ]);
        } else {
          this.item.update({
            "system.occupationalSkills": occSkills,
          });
        }
      }
    }

    //@ts-expect-error name
    if (event?.currentTarget?.id.startsWith("income-skill-")) {
      //@ts-expect-error dataset
      const targetRqid = event.currentTarget.dataset.skillRqid;
      if (targetRqid) {
        const occSkills = (this.item.system as OccupationDataSourceData).occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            //@ts-expect-error checked
            skill.incomeSkill = event.currentTarget?.checked;
          }
        }
        if (this.item.isEmbedded) {
          this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "system.occupationalSkills": occSkills,
            },
          ]);
        } else {
          this.item.update({
            "system.occupationalSkills": occSkills,
          });
        }
      }
    }

    const specializationFormatted = formData["system.specialization"]
      ? ` (${formData["system.specialization"]})`
      : "";
    const newName = formData["system.occupation"] + specializationFormatted;
    if (newName) {
      // If there's nothing in the occupation or region, don't rename
      formData["name"] = newName;
    }
    return super._updateObject(event, formData);
  }

  public override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    const form = this.form as HTMLFormElement;

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
          const rqidToDelete = getDomDataset(ev, "delete-occupational-skill-rqid");
          const thisOccupation = this.item.system as OccupationDataSourceData;
          const occSkills = thisOccupation.occupationalSkills.filter(function (skill) {
            return skill.skillRqidLink?.rqid !== rqidToDelete;
          });

          if (this.item.isEmbedded) {
            await this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "system.occupationalSkills": occSkills,
              },
            ]);
          } else {
            await this.item.update({
              "system.occupationalSkills": occSkills,
            });
          }
        });
      });
  }

  private toggleSkillEdit(forceEdit = false) {
    const form = this.form as HTMLFormElement;
    const displaySkills = form.querySelector("#occupational-skill-display-" + this.item.id);
    assertHtmlElement(displaySkills);
    const editSkills = form.querySelector("#occupational-skill-edit-" + this.item.id);
    assertHtmlElement(editSkills);
    const btnEdit = form.querySelector("#btn-edit-occupational-skills-" + this.item.id);
    assertHtmlElement(btnEdit);
    if (!displaySkills || !editSkills || !btnEdit) {
      console.error(
        "RQG | Didn't find HtmlElements in toggleSkillEdit",
        form,
        displaySkills,
        editSkills,
        btnEdit,
      );
      return;
    }
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

  override async _onDropItem(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    const allowedDropDocumentTypes = getAllowedDropDocumentTypes(event);
    const droppedItem = await Item.implementation.fromDropData(data);

    if (!isAllowedDocumentType(droppedItem, allowedDropDocumentTypes)) {
      return false;
    }

    if (droppedItem.type === ItemTypeEnum.Homeland) {
      // For this one we're just saving the name of the homeland, without the region
      // to an array of strings.
      const homelands = this.item.system.homelands;
      const newHomeland = droppedItem.system.homeland;
      if (!homelands.includes(newHomeland)) {
        homelands.push(newHomeland);
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "system.homelands": homelands,
            },
          ]);
        } else {
          await this.item.update({
            "system.homelands": homelands,
          });
        }
      }
      return [this.item];
    }

    if (droppedItem.type === ItemTypeEnum.Skill) {
      // Skills require special handling here (rather than in RqgItemSheet) because
      // we will associate the skill with a bonus
      const droppedRqid = droppedItem.getFlag(systemId, documentRqidFlags);

      if (droppedRqid && droppedRqid.id) {
        const occSkill = new OccupationalSkill();
        occSkill.bonus = 0;
        occSkill.incomeSkill = false;
        occSkill.skillRqidLink = new RqidLink(droppedRqid?.id, droppedItem.name || "");

        const occSkills = this.item.system.occupationalSkills;

        // this is intentionally NOT checking for duplicate skills
        // since an Occupation might have generic skills more than once,
        // for example Craft(...)
        occSkills.push(occSkill);

        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "system.occupationalSkills": occSkills,
            },
          ]);
        } else {
          await this.item.update({
            "system.occupationalSkills": occSkills,
          });
        }
      } else {
        // see #315 and this situation should be handled however we decide
        // to generally handle dropping things that do not have rqids
        console.log("Dropped skill did not have an Rqid");
      }
      // Return now so we don't handle his at the RqgItemSheet._onDrop
      return [this.item];
    }

    return await super._onDropItem(event, data);
  }
}
