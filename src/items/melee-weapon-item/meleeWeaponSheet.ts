import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  AttackType,
  MeleeWeaponData,
} from "../../data-model/item-data/meleeWeaponData";
import {
  SkillCategoryEnum,
  SkillData,
} from "../../data-model/item-data/skillData";

export class MeleeWeaponSheet extends ItemSheet {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MeleeWeapon],
      template: "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
      width: 520,
      height: 250,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: MeleeWeaponData = sheetData.item.data;
    data.presentationAttackTypes = {};
    data.presentationAttackTypes.crush = data.attackTypes.includes(
      AttackType.Crush
    );
    data.presentationAttackTypes.slash = data.attackTypes.includes(
      AttackType.Slash
    );
    data.presentationAttackTypes.impale = data.attackTypes.includes(
      AttackType.Impale
    );

    data.meleeWeaponSkills = this.actor
      .getEmbeddedCollection("OwnedItem")
      .filter(
        (i: ItemData<SkillData>) =>
          i.type === ItemTypeEnum.Skill &&
          (i.data.category === SkillCategoryEnum.MeleeWeapons ||
            i.data.category === SkillCategoryEnum.Shields)
      );

    return sheetData;
  }

  protected _updateObject(
    event: Event | JQuery.Event,
    formData: any
  ): Promise<any> {
    const attackTypes = [];
    if (formData["data.presentationAttackTypes.crush"]) {
      attackTypes.push(AttackType.Crush);
    }
    if (formData["data.presentationAttackTypes.slash"]) {
      attackTypes.push(AttackType.Slash);
    }
    if (formData["data.presentationAttackTypes.impale"]) {
      attackTypes.push(AttackType.Impale);
    }
    formData["data.attackTypes"] = attackTypes;
    delete formData["data.presentationAttackTypes"];
    return super._updateObject(event, formData);
  }
}
