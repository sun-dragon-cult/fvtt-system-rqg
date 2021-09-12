import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import {
  MissileWeaponDataProperties,
  MissileWeaponDataPropertiesData,
} from "../../data-model/item-data/missileWeaponData";
import { EquippedStatus, equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType, logMisconfiguration } from "../../system/util";
import { CombatManeuver } from "../../data-model/item-data/meleeWeaponData";

interface MissileWeaponSheetData {
  data: MissileWeaponDataProperties; // Actually contains more...complete with effects, flags etc
  missileWeaponData: MissileWeaponDataPropertiesData;
  sheetSpecific: {
    allCombatManeuvers: any;
    missileWeaponSkills: RqgItem[];
    /** For showing the name of the linked skill if the item isn't owned */
    skillName: string;
    equippedStatuses: EquippedStatus[];
    ownedProjectiles: RqgItem[];
  };
}
export class MissileWeaponSheet extends RqgItemSheet<
  ItemSheet.Options,
  MissileWeaponSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MissileWeapon],
      template: "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
      width: 450,
      height: 600,
    });
  }

  async getData(): Promise<MissileWeaponSheetData | ItemSheet.Data> {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.MissileWeapon);

    const missileWeaponData = itemData.data;

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      options: this.options,
      data: itemData,
      missileWeaponData: missileWeaponData,
      sheetSpecific: {
        allCombatManeuvers: this.getAllCombatManeuvers(missileWeaponData),
        missileWeaponSkills: this.getMissileWeaponSkills(),
        skillName: await this.getSkillName(missileWeaponData),
        equippedStatuses: [...equippedStatuses],
        ownedProjectiles: this.getOwnedProjectiles(),
      },
    };
  }

  private getAllCombatManeuvers(missileWeaponData: MissileWeaponDataPropertiesData): any {
    return Object.values(CombatManeuver).reduce((acc: any, m: CombatManeuver) => {
      const v = missileWeaponData.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
  }

  private getMissileWeaponSkills(): any {
    return this.item.isEmbedded && this.actor
      ? this.actor
          .getEmbeddedCollection("Item")
          .filter(
            (i) =>
              i.data.type === ItemTypeEnum.Skill &&
              i.data.data.category === SkillCategoryEnum.MissileWeapons
          )
      : [];
  }

  private async getSkillName(missileWeaponData: MissileWeaponDataPropertiesData): Promise<any> {
    if (!this.item.isEmbedded && missileWeaponData.skillOrigin) {
      const skill = await fromUuid(missileWeaponData.skillOrigin).catch(() => {
        logMisconfiguration(
          `Couldn't find missile weapon skill with uuid from skillOrigin ${missileWeaponData.skillOrigin}`,
          true,
          missileWeaponData
        );
      });
      return skill?.name ?? "";
    }
    return "";
  }

  private getOwnedProjectiles(): any {
    if (this.item.isOwned) {
      return this.actor!.getEmbeddedCollection("Item").filter(
        (i) => i.data.type === ItemTypeEnum.MissileWeapon && i.data.data.isProjectile
      );
    }
    return [];
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const combatManeuvers: any = [];
    Object.values(CombatManeuver).forEach((m) => {
      if (formData[`sheetSpecific.allCombatManeuvers.${m}.value`]) {
        combatManeuvers.push(m);
      }
    });

    formData["data.combatManeuvers"] = combatManeuvers;
    Object.values(CombatManeuver).forEach(
      (cm) => delete formData[`sheetSpecific.allCombatManeuvers.${cm}.value`]
    );

    formData["data.physicalItemType"] = formData["data.isProjectile"] ? "consumable" : "unique";

    if (
      !formData["data.isProjectile"] &&
      !formData["data.isProjectileWeapon"] &&
      !formData["data.isThrownWeapon"]
    ) {
      formData["data.isProjectileWeapon"] = true;
    }

    if (formData["data.physicalItemType"] === "unique") {
      formData["data.quantity"] = 1;
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
