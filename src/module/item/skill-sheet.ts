import { skillType } from "../data-model/item-data/item-types";
import { SkillCategoryEnum } from "../data-model/item-data/skill";

export class SkillSheet extends ItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", skillType],
      template: "systems/rqg/module/item/skill-sheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): ItemSheetData {
    const data = super.getData();
    data.data.skillCategories = Object.keys(SkillCategoryEnum);
    data.data.isGM = this.actor ? !this.actor.isPC : true;
    return data;
  }

  // /** @override */
  // setPosition(options = {}) {
  //   const position = super.setPosition(options);
  //   const sheetBody = this.element.find(".sheet-body");
  //   const bodyHeight = position.height - 150;
  //   sheetBody.css("height", bodyHeight);
  //   return position;
  // }
  //
  // /** @override */
  // activateListeners(html: JQuery) {
  //   super.activateListeners(html);
  //
  //   // Everything below here is only needed if the sheet is editable
  //   if (!this.options.editable) return;
  // }
  //
  // /** @override */
  // _updateObject(_: Event, formData: any) {
  //   // Re-combine formData
  //   formData = Object.entries(formData).reduce<any>(
  //     (obj, e) => {
  //       obj[e[0]] = e[1];
  //       return obj;
  //     },
  //     { _id: this.object._id }
  //   );
  //
  //   // Update the Item
  //   return this.object.update(formData);
  // }
}
