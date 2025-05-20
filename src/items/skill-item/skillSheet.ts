import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { getGameUser, AvailableItemCache, getSelectRuneOptions } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { concatenateSkillName } from "./concatenateSkillName";
import { ItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface SkillSheetData {
  skillCategoryOptions: SelectOptionData<SkillCategoryEnum>[];
  allRuneOptions: AvailableItemCache[];
}

export class SkillSheet extends RqgItemSheet<ItemSheet.Options, SkillSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Skill],
      template: templatePaths.itemSkillSheet,
      width: 450,
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

  getData(): SkillSheetData & ItemSheetData {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);
    system.categoryMod = this.document.system.categoryMod; // Use the actor derived value
    system.chance = this.document.system.chance; // Use the actor derived value

    if (!system.skillName) {
      system.skillName = system.name;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      system: system,
      isEmbedded: this.document.isEmbedded,

      skillCategoryOptions: Object.values(SkillCategoryEnum).map((sc) => ({
        value: sc,
        label: "RQG.Actor.Skill.SkillCategory." + sc,
      })),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Skill.AddSorceryRunePlaceholder"),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
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
