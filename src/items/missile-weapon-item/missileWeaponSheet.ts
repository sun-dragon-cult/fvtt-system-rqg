import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum, SkillData, SkillItemData } from "../../data-model/item-data/skillData";
import {
  MissileWeaponData,
  MissileWeaponItemData,
} from "../../data-model/item-data/missileWeaponData";
import { CombatManeuver } from "../../data-model/item-data/meleeWeaponData";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItem } from "../rqgItem";

export class MissileWeaponSheet extends ItemSheet<MissileWeaponItemData> {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MissileWeapon],
      template: "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
      width: 450,
      height: 600,
    });
  }

  async getData(): Promise<MissileWeaponItemData> {
    const sheetData = super.getData() as MissileWeaponItemData;
    const data = sheetData.data;
    // TODO improve types
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc: any, m: any) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    data.isOwned = this.item.isOwned;
    if (this.item.isOwned) {
      data.missileWeaponSkills = this.actor!.getEmbeddedCollection("OwnedItem").filter(
        (i: Item.Data<SkillData>) =>
          i.type === ItemTypeEnum.Skill && i.data.category === SkillCategoryEnum.MissileWeapons
      );

      data.ownedProjectiles = this.actor!.getEmbeddedCollection("OwnedItem").filter(
        (i: Item.Data<MissileWeaponData>) =>
          i.type === ItemTypeEnum.MissileWeapon && i.data.isProjectile
      );
    } else if (data.skillOrigin) {
      const skill = (await fromUuid(data.skillOrigin)) as Item<SkillItemData> | null;
      data.skillName = skill?.name || "";
    }
    data.equippedStatuses = [...equippedStatuses];
    return sheetData;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const combatManeuvers: any = [];
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

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.item.isOwned) {
      (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));
    }
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      return;
    }
    if (droppedItemData.type === "Item") {
      const item = (await Item.fromDropData(droppedItemData)) as RqgItem;
      if (
        item.data.type === ItemTypeEnum.Skill &&
        item.data.data.category === SkillCategoryEnum.MissileWeapons
      ) {
        const skillId = item.uuid || "";
        await this.item.update({ "data.skillOrigin": skillId }, {});
      } else {
        ui.notifications?.warn("The item must be a missile weapon skill");
      }
    }
  }
}
