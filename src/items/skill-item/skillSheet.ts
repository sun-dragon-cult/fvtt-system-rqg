import { SkillCategoryEnum, type SkillItem } from "@item-model/skillData.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertDocumentSubType, getSelectRuneOptions } from "../../system/util";
import { systemId } from "../../system/config";
import { concatenateSkillName } from "./concatenateSkillName";
import type { ItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface SkillSheetData {
  skillCategoryOptions: SelectOptionData<SkillCategoryEnum>[];
  allRuneOptions: SelectOptionData<string>[];
}

export class SkillSheet extends RqgItemSheet {
  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Skill],
      template: templatePaths.itemSkillSheet,
      width: 600,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "skill",
        },
      ],
    });
  }

  override getData(): SkillSheetData & ItemSheetData {
    const system = foundry.utils.duplicate(this.document._source.system);
    const skillItem = this.document;
    assertDocumentSubType<SkillItem>(skillItem, [ItemTypeEnum.Skill]);
    system.categoryMod = skillItem.system?.categoryMod; // Use the actor derived value
    system.chance = skillItem.system?.chance; // Use the actor derived value

    if (!system.skillName) {
      system.skillName = system.name;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: game.user?.isGM ?? false,
      system: system,
      isEmbedded: this.document.isEmbedded,

      skillCategoryOptions: Object.values(SkillCategoryEnum).map((sc) => ({
        value: sc,
        label: "RQG.Actor.Skill.SkillCategory." + sc,
      })),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Skill.AddSorceryRunePlaceholder"),
    };
  }

  protected override _updateObject(event: Event, formData: any): Promise<unknown> {
    formData["name"] = concatenateSkillName(
      formData["system.skillName"],
      formData["system.specialization"],
    );

    if (!this.document.isEmbedded) {
      formData["system.gainedChance"] = 0;
    }

    return super._updateObject(event, formData);
  }
}
