import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

import { SkillCategoryEnum, SkillData } from "../../data-model/item-data/skillData";
import { MissileWeaponData } from "../../data-model/item-data/missileWeaponData";
import { CombatManeuver } from "../../data-model/item-data/meleeWeaponData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";

export class MissileWeaponSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MissileWeapon],
      template: "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
      width: 450,
      height: 600,
    });
  }

  // @ts-ignore
  async getData() {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: MissileWeaponData = sheetData.item.data;
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc, m) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    data.isOwned = this.item.isOwned;
    if (this.item.isOwned) {
      data.missileWeaponSkills = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: ItemData<SkillData>) =>
            i.type === ItemTypeEnum.Skill && i.data.category === SkillCategoryEnum.MissileWeapons
        );

      data.ownedProjectiles = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: ItemData<MissileWeaponData>) =>
            i.type === ItemTypeEnum.MissileWeapon && i.data.isProjectile
        );
    } else if (data.skillOrigin) {
      // @ts-ignore
      const skill = await fromUuid(data.skillOrigin);
      data.skillName = skill?.name || "";
    }
    data.equippedStatuses = [...equippedStatuses];
    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
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

    if (formData["data.physicalItemType"] === "unique") {
      formData["data.quantity"] = 1;
    }

    formData["data.physicalItemType"] = formData["data.isProjectile"] ? "consumable" : "unique";

    if (
      !formData["data.isProjectile"] &&
      !formData["data.isProjectileWeapon"] &&
      !formData["data.isThrownWeapon"]
    ) {
      formData["data.isProjectileWeapon"] = true;
    }
    return super._updateObject(event, formData);
  }

  protected activateListeners(html: JQuery) {
    super.activateListeners(html);
    if (!this.item.isOwned) {
      this.form.addEventListener("drop", this._onDrop.bind(this));
    }
  }

  protected async _onDrop(event: DragEvent) {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }
    if (droppedItemData.type === "Item") {
      // @ts-ignore
      const item = await Item.fromDropData(droppedItemData);
      if (
        item.type === ItemTypeEnum.Skill &&
        item.data.data.category === SkillCategoryEnum.MissileWeapons
      ) {
        const skillId = item.uuid || "";
        await this.item.update({ "data.skillOrigin": skillId }, {});
      } else {
        ui.notifications.warn("The item must be a missile weapon skill");
      }
    }
  }
}
