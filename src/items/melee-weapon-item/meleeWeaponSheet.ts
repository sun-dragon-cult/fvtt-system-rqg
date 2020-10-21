import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  CombatManeuver,
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
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc, m) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});

    data.meleeWeaponSkills = this.actor
      .getEmbeddedCollection("OwnedItem")
      .filter(
        (i: ItemData<SkillData>) =>
          i.type === ItemTypeEnum.Skill &&
          (i.data.category === SkillCategoryEnum.MeleeWeapons ||
            i.data.category === SkillCategoryEnum.Shields ||
            i.data.category === SkillCategoryEnum.NaturalWeapons)
      );

    return sheetData;
  }

  protected _updateObject(
    event: Event | JQuery.Event,
    formData: any
  ): Promise<any> {
    const combatManeuvers = [];
    Object.values(CombatManeuver).forEach((m) => {
      if (formData[`data.allCombatManeuvers.${m}.value`]) {
        combatManeuvers.push(m);
      }
    });

    formData["data.combatManeuvers"] = combatManeuvers;
    Object.values(CombatManeuver).forEach(
      (cm) => delete formData[`data.allCombatManeuvers.${cm}.value`]
    );
    return super._updateObject(event, formData);
  }
}
