import {
  OccupationalSkill,
  type OccupationItem,
  StandardOfLivingEnum,
} from "@item-model/occupationDataModel.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getDomDataset, isDocumentSubType, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import {
  RqgItemSheetV2,
  type RqgItemSheetContext,
  type AppV2RenderContext,
  type AppV2RenderOptions,
} from "../RqgItemSheetV2";
import { systemId } from "../../system/config";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { HomelandItem } from "@item-model/homelandDataModel.ts";
import type { SkillItem } from "@item-model/skillDataModel.ts";

interface OccupationSheetContext extends RqgItemSheetContext {
  homelandsJoined: string;
  standardsOfLivingOptions: SelectOptionData<StandardOfLivingEnum>[];
  skillsJoined: string;
}

type OccupationalSkillLike = {
  incomeSkill?: unknown;
  bonus?: unknown;
  skillRqidLink?: { rqid?: unknown; name?: unknown };
  rqid?: unknown;
  name?: unknown;
};

function normalizeOccupationalSkills(skills: unknown): OccupationalSkill[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill: unknown): OccupationalSkill | undefined => {
      const occupationalSkill = skill as OccupationalSkillLike;
      const rqid = String(
        occupationalSkill.skillRqidLink?.rqid ?? occupationalSkill.rqid ?? "",
      ).trim();
      if (!rqid) {
        return undefined;
      }
      const name =
        String(occupationalSkill.skillRqidLink?.name ?? occupationalSkill.name ?? "").trim() ||
        rqid;
      const bonusValue = Number(occupationalSkill.bonus ?? 0);

      return {
        incomeSkill: Boolean(occupationalSkill.incomeSkill),
        bonus: Number.isFinite(bonusValue) ? bonusValue : 0,
        skillRqidLink: { rqid, name },
      };
    })
    .filter((skill): skill is OccupationalSkill => skill !== undefined);
}

export class OccupationSheetV2 extends RqgItemSheetV2 {
  override get document(): OccupationItem {
    return super.document as OccupationItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "occupation"],
    position: { width: 600, height: 650 },
    form: { handler: OccupationSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS = {
    header: { template: templatePaths.itemOccupationSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    occupation: { template: templatePaths.itemOccupationSheetV2Occupation, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [{ id: "occupation", label: "RQG.Item.SheetTab.Occupation" }],
      initial: "occupation",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<OccupationSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;
    const occupationalSkills = normalizeOccupationalSkills(system.occupationalSkills);
    system.occupationalSkills = occupationalSkills;

    const context: OccupationSheetContext = {
      ...base,
      homelandsJoined: system.homelands.join(", "),
      standardsOfLivingOptions: Object.values(StandardOfLivingEnum).map((standard) => ({
        value: standard,
        label: localize("RQG.Item.Occupation.StandardOfLivingEnum." + standard),
      })),
      skillsJoined: occupationalSkills
        .map((skill: OccupationalSkill) => {
          const bonus = `${skill.bonus >= 0 ? "+" : ""}${skill.bonus}%`;
          if (skill.incomeSkill) {
            return `<span class="income-skill-text">${skill.skillRqidLink?.name} ${bonus}</span>`;
          } else {
            return `<span>${skill.skillRqidLink?.name} ${bonus}</span>`;
          }
        })
        .join(", "),
    };

    context.tabs = this._prepareTabs("sheet");

    return context;
  }

  override async _onRender(
    context: AppV2RenderContext,
    options: AppV2RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);

    this.element
      .querySelector<HTMLElement>("#btn-edit-occupational-skills-" + this.document.id)
      ?.addEventListener("click", () => this.toggleSkillEdit());

    this.element
      .querySelectorAll<HTMLElement>("[data-delete-occupational-skill-rqid]")
      .forEach((el) => {
        el.addEventListener("click", async (ev: MouseEvent) => {
          const rqidToDelete = getDomDataset(ev, "delete-occupational-skill-rqid");
          const occSkills = this.document.system.occupationalSkills.filter(
            (skill: any) => skill.skillRqidLink?.rqid !== rqidToDelete,
          );
          await this.updateOccupationalSkills(occSkills);
        });
      });

    // Inline bonus inputs — update immediately without full form submit
    this.element.querySelectorAll<HTMLInputElement>("[id^='bonus-']").forEach((el) => {
      el.addEventListener("change", async (ev: Event) => {
        const input = ev.currentTarget as HTMLInputElement;
        const targetRqid = input.dataset["skillRqid"];
        if (!targetRqid) {
          return;
        }
        const occSkills = this.document.system.occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            skill.bonus = Number(input.value);
          }
        }
        await this.updateOccupationalSkills(occSkills);
      });
    });

    // Inline income-skill checkboxes
    this.element.querySelectorAll<HTMLInputElement>("[id^='income-skill-']").forEach((el) => {
      el.addEventListener("change", async (ev: Event) => {
        const input = ev.currentTarget as HTMLInputElement;
        const targetRqid = input.dataset["skillRqid"];
        if (!targetRqid) {
          return;
        }
        const occSkills = this.document.system.occupationalSkills;
        for (const skill of occSkills) {
          if (skill.skillRqidLink?.rqid === targetRqid) {
            skill.incomeSkill = input.checked;
          }
        }
        await this.updateOccupationalSkills(occSkills);
      });
    });
  }

  private async updateOccupationalSkills(occSkills: any[]): Promise<void> {
    if (this.document.isEmbedded) {
      await this.document.actor?.updateEmbeddedDocuments("Item", [
        { _id: this.document.id, system: { occupationalSkills: occSkills } },
      ]);
    } else {
      await this.document.update({ system: { occupationalSkills: occSkills } });
    }
  }

  private toggleSkillEdit(): void {
    const displaySkills = this.element.querySelector<HTMLElement>(
      "#occupational-skill-display-" + this.document.id,
    );
    const editSkills = this.element.querySelector<HTMLElement>(
      "#occupational-skill-edit-" + this.document.id,
    );
    const btnEdit = this.element.querySelector<HTMLElement>(
      "#btn-edit-occupational-skills-" + this.document.id,
    );
    if (!displaySkills || !editSkills || !btnEdit) {
      return;
    }

    if (displaySkills.style.display === "block") {
      displaySkills.style.display = "none";
      editSkills.style.display = "block";
      btnEdit.style.color = "gray";
    } else {
      displaySkills.style.display = "block";
      editSkills.style.display = "none";
      btnEdit.style.color = "black";
    }
  }

  protected override async _onDropDocument(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    if (data.type !== "Item") {
      return super._onDropDocument(event, data);
    }

    const allowedDropDocumentTypes = getAllowedDropDocumentTypes(event);
    const droppedItem = await Item.implementation.fromDropData(data);

    if (
      !isAllowedDocumentType(droppedItem as foundry.abstract.Document.Any, allowedDropDocumentTypes)
    ) {
      return false;
    }

    if (isDocumentSubType<HomelandItem>(droppedItem, ItemTypeEnum.Homeland)) {
      const homelands = this.document.system.homelands;
      const newHomeland = (droppedItem as HomelandItem).system.homeland;
      if (!homelands.includes(newHomeland)) {
        homelands.push(newHomeland);
        if (this.document.isEmbedded) {
          await this.document.actor?.updateEmbeddedDocuments("Item", [
            { _id: this.document.id, system: { homelands } },
          ]);
        } else {
          await this.document.update({ system: { homelands } });
        }
      }
      return [this.document];
    }

    if (isDocumentSubType<SkillItem>(droppedItem, ItemTypeEnum.Skill)) {
      const droppedRqid = (droppedItem as SkillItem).getFlag(systemId, documentRqidFlags);
      if (droppedRqid && droppedRqid.id) {
        const occSkill: OccupationalSkill = {
          bonus: 0,
          incomeSkill: false,
          skillRqidLink: {
            rqid: droppedRqid.id,
            name: droppedItem.name || "",
          },
        };
        const occSkills = normalizeOccupationalSkills(this.document.system.occupationalSkills);
        occSkills.push(occSkill);
        await this.updateOccupationalSkills(occSkills);
      } else {
        console.log("Dropped skill did not have an Rqid");
      }
      return [this.document];
    }

    return super._onDropDocument(event, data);
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as OccupationSheetV2;
    const data = formData.object as Record<string, unknown>;

    const specializationFormatted = data["system.specialization"]
      ? ` (${data["system.specialization"]})`
      : "";
    const newName = String(data["system.occupation"]) + specializationFormatted;
    if (newName) {
      data["name"] = newName;
    }

    await sheet.document.update(data);
  }
}
