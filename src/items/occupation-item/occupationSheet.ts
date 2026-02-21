import {
  OccupationalSkill,
  type OccupationItem,
  StandardOfLivingEnum,
} from "@item-model/occupationData.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { assertHtmlElement, getDomDataset, isDocumentSubType, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqidLink } from "../../data-model/shared/rqidLink";
import type { DocumentSheetData } from "../shared/sheetInterfaces.types.ts";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { HomelandItem } from "@item-model/homelandData.ts";
import type { SkillItem } from "@item-model/skillData.ts";

export interface OccupationSheetData {
  homelandsJoined: string;
  standardsOfLivingOptions: SelectOptionData<StandardOfLivingEnum>[];
  skillsJoined: string;
}

export class OccupationSheet extends RqgItemSheet {
  override get document(): OccupationItem {
    return super.document as OccupationItem;
  }

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
            return `<span class="income-skill-text">${skill.skillRqidLink?.name} ${bonus}</span>`;
          } else {
            return `<span>${skill.skillRqidLink?.name} ${bonus}</span>`;
          }
        })
        .join(", "),
    };
  }

  protected override _updateObject(event: Event, formData: any): Promise<any> {
    // @ts-expect-error currentTarget.id
    if (event?.currentTarget?.id.startsWith("bonus-")) {
      //@ts-expect-error dataset
      const targetRqid = event.currentTarget.dataset.skillRqid;
      if (targetRqid) {
        const occSkills = this.document.system.occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            //@ts-expect-error value
            skill.bonus = Number(event.currentTarget.value);
          }
        }
        if (this.document.isEmbedded) {
          this.document.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.document.id,
              system: { occupationalSkills: occSkills },
            },
          ]);
        } else {
          this.document.update({
            system: { occupationalSkills: occSkills },
          });
        }
      }
    }

    const currentTarget = event?.currentTarget as HTMLInputElement | null;
    if (currentTarget?.id.startsWith("income-skill-")) {
      const targetRqid = currentTarget.dataset["skillRqid"];
      if (targetRqid) {
        const occSkills = this.document.system.occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            skill.incomeSkill = currentTarget.checked;
          }
        }
        if (this.document.isEmbedded) {
          this.document.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.document.id,
              system: { occupationalSkills: occSkills },
            },
          ]);
        } else {
          this.document.update({
            system: { occupationalSkills: occSkills },
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
      .querySelector("#btn-edit-occupational-skills-" + this.document.id)
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
          const thisOccupation = this.document.system;
          const occSkills = thisOccupation.occupationalSkills.filter(function (skill) {
            return skill.skillRqidLink?.rqid !== rqidToDelete;
          });

          if (this.document.isEmbedded) {
            await this.document.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.document.id,
                system: { occupationalSkills: occSkills },
              },
            ]);
          } else {
            await this.document.update({
              system: { occupationalSkills: occSkills },
            });
          }
        });
      });
  }

  private toggleSkillEdit(forceEdit = false) {
    const form = this.form as HTMLFormElement;
    const displaySkills = form.querySelector("#occupational-skill-display-" + this.document.id);
    assertHtmlElement(displaySkills);
    const editSkills = form.querySelector("#occupational-skill-edit-" + this.document.id);
    assertHtmlElement(editSkills);
    const btnEdit = form.querySelector("#btn-edit-occupational-skills-" + this.document.id);
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

    if (
      !isAllowedDocumentType(droppedItem as foundry.abstract.Document.Any, allowedDropDocumentTypes)
    ) {
      return false;
    }

    if (isDocumentSubType<HomelandItem>(droppedItem, ItemTypeEnum.Homeland)) {
      // For this one we're just saving the name of the homeland, without the region
      // to an array of strings.
      const homelands = this.document.system.homelands;
      const newHomeland = droppedItem.system.homeland;
      if (!homelands.includes(newHomeland)) {
        homelands.push(newHomeland);
        if (this.document.isEmbedded) {
          await this.document.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.document.id,
              system: { homelands: homelands },
            },
          ]);
        } else {
          await this.document.update({
            system: { homelands: homelands },
          });
        }
      }
      return [this.document];
    }

    if (isDocumentSubType<SkillItem>(droppedItem, ItemTypeEnum.Skill)) {
      // Skills require special handling here (rather than in RqgItemSheet) because
      // we will associate the skill with a bonus
      const droppedRqid = droppedItem.getFlag(systemId, documentRqidFlags);

      if (droppedRqid && droppedRqid.id) {
        const occSkill = new OccupationalSkill();
        occSkill.bonus = 0;
        occSkill.incomeSkill = false;
        occSkill.skillRqidLink = new RqidLink(droppedRqid?.id, droppedItem.name || "");

        const occSkills = this.document.system.occupationalSkills;

        // this is intentionally NOT checking for duplicate skills
        // since an Occupation might have generic skills more than once,
        // for example Craft(...)
        occSkills.push(occSkill);

        if (this.document.isEmbedded) {
          await this.document.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.document.id,
              system: { occupationalSkills: occSkills },
            },
          ]);
        } else {
          await this.document.update({
            system: { occupationalSkills: occSkills },
          });
        }
      } else {
        // see #315 and this situation should be handled however we decide
        // to generally handle dropping things that do not have rqids
        console.log("Dropped skill did not have an Rqid");
      }
      // Return now so we don't handle his at the RqgItemSheet._onDrop
      return [this.document];
    }

    return await super._onDropItem(event, data);
  }
}
