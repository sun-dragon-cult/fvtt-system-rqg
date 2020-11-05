import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

import {
  SkillCategoryEnum,
  SkillData,
} from "../../data-model/item-data/skillData";
import { MissileWeaponData } from "../../data-model/item-data/missileWeaponData";
import { CombatManeuver } from "../../data-model/item-data/meleeWeaponData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class MissileWeaponSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MissileWeapon],
      template: "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
      width: 450,
      height: 600,
    });
  }

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: MissileWeaponData = sheetData.item.data;
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc, m) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    if (this.actor) {
      data.missileWeaponSkills = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: ItemData<SkillData>) =>
            i.type === ItemTypeEnum.Skill &&
            i.data.category === SkillCategoryEnum.MissileWeapons
        );

      data.ownedProjectiles = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: ItemData<MissileWeaponData>) =>
            i.type === ItemTypeEnum.MissileWeapon && i.data.isProjectile
        );
    }
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
