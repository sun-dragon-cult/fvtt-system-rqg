import { SkillCategoryEnum, SkillData } from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class SkillSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: SkillData = sheetData.item.data;
    if (!data.skillName) {
      data.skillName = sheetData.item.name;
    }
    data.skillCategories = Object.values(SkillCategoryEnum);
    data.isGM = this.actor ? !this.actor.isPC : true; // TODO isPC is deprecated use getOwners (coming in 0.7.6)
    data.runes = Array.isArray(data.runes) ? data.runes : [data.runes];
    data.allRunes = game.settings.get("rqg", "runes");
    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    const specialization = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
    formData["name"] = formData["data.skillName"] + specialization;

    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }
}
