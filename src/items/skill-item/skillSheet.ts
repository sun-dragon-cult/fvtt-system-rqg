import {
  SkillCategoryEnum,
  SkillDataProperties,
  SkillDataPropertiesData,
} from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet, RqgItemSheetData } from "../RqgItemSheet";
import {
  assertItemType,
  getAvailableRunes,
  getGameUser,
  AvailableRuneCache,
} from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";

interface SkillSheetData extends RqgItemSheetData {
  isEmbedded: boolean;
  data: SkillDataProperties; // Actually contains more...complete with effects, flags etc
  skillData: SkillDataPropertiesData;
  sheetSpecific: {
    skillCategories: SkillCategoryEnum[];
    journalEntryName: string;
    allRunes: AvailableRuneCache[];
  };
}

export class SkillSheet extends RqgItemSheet<ItemSheet.Options, SkillSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.hbs",
      width: 450,
      height: 500,
      tabs: [
        { navSelector: ".item-sheet-nav-tabs", contentSelector: ".sheet-body", initial: "skill" },
      ],
    });
  }

  getData(): SkillSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Skill);
    const skillData = itemData.data;
    if (!skillData.skillName) {
      skillData.skillName = itemData.name;
    }
    skillData.runes = Array.isArray(skillData.runes) ? skillData.runes : [skillData.runes];

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      skillData: itemData.data,
      sheetSpecific: {
        skillCategories: Object.values(SkillCategoryEnum),
        journalEntryName: skillData.descriptionRqidLink.name,
        allRunes: getAvailableRunes(),
      },
      isGM: getGameUser().isGM,
      ownerId: this.document.actor?.id,
      uuid: this.document.uuid,
      supportedLanguages: CONFIG.supportedLanguages,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    const specialization = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
    formData["name"] =
      formData["data.skillName"] + specialization;

    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: any) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    return super._onDrop(event);
  }
}
