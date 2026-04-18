import { SkillCategoryEnum, type SkillItem } from "@item-model/skillDataModel.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { assertDocumentSubType, getSelectRuneOptions } from "../../system/util";
import { systemId } from "../../system/config";
import { concatenateSkillName } from "./concatenateSkillName";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface SkillSheetContext extends RqgItemSheetContext {
  skillCategoryOptions: SelectOptionData<SkillCategoryEnum>[];
  allRuneOptions: SelectOptionData<string>[];
}

export class SkillSheetV2 extends RqgItemSheetV2 {
  override get document(): SkillItem {
    return super.document as SkillItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "skill"],
    position: { width: 600, height: 420 },
    form: { handler: SkillSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.itemSkillSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    skill: { template: templatePaths.itemSkillSheetV2Skill, scrollable: [""] },
    definition: { template: templatePaths.itemSkillSheetV2Definition, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "skill", label: "RQG.Item.SheetTab.Skill" },
        { id: "definition", label: "RQG.Item.SheetTab.SkillDefinition" },
      ],
      initial: "skill",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<SkillSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    const skillItem = this.document;
    assertDocumentSubType<SkillItem>(skillItem, ItemTypeEnum.Skill);
    // Overlay actor-derived values on top of source data
    system.categoryMod = skillItem.system?.categoryMod;
    system.chance = skillItem.system?.chance;

    system.skillName ||= base.name;

    const context: SkillSheetContext = {
      ...base,
      skillCategoryOptions: Object.values(SkillCategoryEnum).map((sc) => ({
        value: sc,
        label: "RQG.Actor.Skill.SkillCategory." + sc,
      })),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Skill.AddSorceryRunePlaceholder"),
    };

    if (!context.isEmbedded && this.tabGroups?.["sheet"] === "skill") {
      this.tabGroups["sheet"] = "definition";
    }
    if (!context.isGM && this.tabGroups?.["sheet"] === "definition") {
      this.tabGroups["sheet"] = "skill";
    }

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isEmbedded) {
      delete (context as any).tabs.skill;
    }
    if (!context.isGM) {
      delete (context as any).tabs.definition;
    }

    return context;
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as SkillSheetV2;
    const data = formData.object as Record<string, unknown>;

    data["name"] = concatenateSkillName(
      data["system.skillName"] as string,
      data["system.specialization"] as string,
    );

    if (!sheet.document.isEmbedded) {
      data["system.gainedChance"] = 0;
    }

    await sheet.document.update(data);
  }
}
