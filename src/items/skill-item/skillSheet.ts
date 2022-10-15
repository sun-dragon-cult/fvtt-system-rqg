import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { getAvailableRunes, getGameUser, AvailableRuneCache } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { concatenateSkillName } from "./concatenateSkillName";
import { ItemSheetData } from "../shared/sheetInterfaces";

interface SkillSheetData {
  skillCategories: SkillCategoryEnum[];
  allRunes: AvailableRuneCache[];
}

export class SkillSheet extends RqgItemSheet<ItemSheet.Options, SkillSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.hbs",
      width: 450,
      height: 500,
      tabs: [
        { navSelector: ".item-sheet-nav-tabs", contentSelector: ".sheet-body", initial: "skill" },
      ],
    });
  }

  getData(): SkillSheetData & ItemSheetData {
    const system = duplicate(this.document.system);

    if (!system.skillName) {
      system.skillName = system.name;
    }
    system.runes = Array.isArray(system.runes) ? system.runes : [system.runes];

    return {
      id: this.document.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      system: system,
      isEmbedded: this.document.isEmbedded,

      skillCategories: Object.values(SkillCategoryEnum),
      allRunes: getAvailableRunes(),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    formData["name"] = concatenateSkillName(
      formData["system.skillName"],
      formData["system.specialization"]
    );

    if (!this.document.isEmbedded) {
      formData["system.gainedChance"] = 0;
    }

    let runes = formData["system.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: any) => r); // Remove empty
    formData["system.runes"] = duplicate(runes);
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
